package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/prometheus/sigv4"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/internal/helpers"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

type OpenAIProxy struct {
	proxy        *httputil.ReverseProxy
	tokenRotator helpers.TokenRotator
}

type mantleSigV4RoundTripper struct {
	mantleHost string
	signer     http.RoundTripper
	next       http.RoundTripper
}

func (in mantleSigV4RoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	if request.URL.Host == in.mantleHost {
		removeMantleSigV4ProxyHeaders(request.Header)
		return in.signer.RoundTrip(request)
	}

	return in.next.RoundTrip(request)
}

func removeMantleSigV4ProxyHeaders(header http.Header) {
	for _, connection := range header.Values("Connection") {
		for _, name := range strings.Split(connection, ",") {
			header.Del(strings.TrimSpace(name))
		}
	}

	for _, name := range []string{
		"Connection",
		"Forwarded",
		"Keep-Alive",
		"Proxy-Authenticate",
		"Proxy-Authorization",
		"Proxy-Connection",
		"Te",
		"Trailer",
		"Transfer-Encoding",
		"Upgrade",
		"Via",
		"X-Forwarded-For",
		"X-Forwarded-Host",
		"X-Forwarded-Proto",
		"X-Real-IP",
	} {
		header.Del(name)
	}
}

func (o *OpenAIProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		o.proxy.ServeHTTP(w, r)
	}
}

func NewOpenAIProxy(host string, tokenRotator *helpers.RoundRobinTokenRotator, mantleConfig api.MantleConfig) (api.OpenAIProxy, error) {
	if len(tokenRotator.Tokens) == 0 {
		return nil, fmt.Errorf("at least one token is required")
	}

	parsedURL, err := helpers.ParseProviderBaseURL(host)
	if err != nil {
		return nil, err
	}

	var transport http.RoundTripper
	if mantleConfig.SigV4 {
		transport, err = newMantleSigV4RoundTripper(context.Background(), mantleConfig)
		if err != nil {
			return nil, err
		}
	}

	reverse := &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetXForwarded()

			targetPath := openai.EndpointChatCompletions
			if r.In.URL.Path == openai.EndpointResponses {
				targetPath = "/v1/responses"
			}

			target := *parsedURL
			token := tokenRotator.GetNextToken()
			upstreamPath := targetPath
			mantleRequest := mantleConfig.Enabled() && routeToMantle(r, mantleConfig.ModelPrefixes)
			if mantleRequest {
				target.Scheme = "https"
				target.Host = fmt.Sprintf("bedrock-mantle.%s.api.aws", mantleConfig.AWSRegion)
				target.Path = "/openai/v1"
				upstreamPath = strings.TrimRight(target.Path, "/") + strings.TrimPrefix(targetPath, "/v1")

				if !mantleConfig.SigV4 {
					token = mantleConfig.APIKey
				}
			}

			if !mantleRequest || !mantleConfig.SigV4 {
				r.Out.Header.Set("Authorization", "Bearer "+token)
			} else {
				r.Out.Header.Del("Authorization")
			}
			r.Out.URL.Scheme = target.Scheme
			r.Out.URL.Host = target.Host
			r.Out.Host = target.Host
			r.Out.URL.Path = upstreamPath

			klog.V(log.LogLevelDebug).InfoS(
				"proxying request",
				"from", fmt.Sprintf("%s %s", r.In.Method, r.In.URL.Path),
				"to", r.Out.URL.String(),
			)
		},
	}

	return &OpenAIProxy{
		proxy:        reverse,
		tokenRotator: tokenRotator,
	}, nil
}

func newMantleSigV4RoundTripper(ctx context.Context, mantleConfig api.MantleConfig) (http.RoundTripper, error) {
	return newMantleSigV4RoundTripperWithBase(ctx, mantleConfig, http.DefaultTransport)
}

func newMantleSigV4RoundTripperWithBase(ctx context.Context, mantleConfig api.MantleConfig, base http.RoundTripper) (http.RoundTripper, error) {
	region := strings.TrimSpace(mantleConfig.AWSRegion)
	if region == "" {
		return nil, fmt.Errorf("AWS region is required for Bedrock Mantle SigV4 authentication")
	}

	awsConfig, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("loading default AWS configuration for Bedrock Mantle SigV4 authentication: %w", err)
	}
	if _, err := awsConfig.Credentials.Retrieve(ctx); err != nil {
		return nil, fmt.Errorf("retrieving default AWS credentials for Bedrock Mantle SigV4 authentication: %w", err)
	}

	if base == nil {
		base = http.DefaultTransport
	}
	signer, err := sigv4.NewSigV4RoundTripper(&sigv4.SigV4Config{
		Region:      region,
		ServiceName: "bedrock-mantle",
	}, base)
	if err != nil {
		return nil, fmt.Errorf("configuring Bedrock Mantle SigV4 signing: %w", err)
	}

	return mantleSigV4RoundTripper{
		mantleHost: fmt.Sprintf("bedrock-mantle.%s.api.aws", region),
		signer:     signer,
		next:       base,
	}, nil
}

func routeToMantle(r *httputil.ProxyRequest, modelPrefixes []string) bool {
	if r.Out.Body == nil {
		return false
	}

	body, err := io.ReadAll(r.Out.Body)
	if err != nil {
		klog.ErrorS(err, "failed to read OpenAI request body")
		return false
	}
	defer func() { _ = r.Out.Body.Close() }()

	r.Out.Body = io.NopCloser(bytes.NewReader(body))
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return false
	}

	model, ok := payload["model"].(string)
	if !ok || !hasModelPrefix(model, modelPrefixes) {
		return false
	}

	if !strings.HasPrefix(model, "openai.") {
		payload["model"] = "openai." + model
		rewrittenBody, err := json.Marshal(payload)
		if err != nil {
			klog.ErrorS(err, "failed to rewrite OpenAI model for Amazon Bedrock Mantle")
			return false
		}

		r.Out.Body = io.NopCloser(bytes.NewReader(rewrittenBody))
		r.Out.ContentLength = int64(len(rewrittenBody))
		if r.Out.Header == nil {
			r.Out.Header = make(http.Header)
		}
		r.Out.Header.Set("Content-Length", fmt.Sprint(len(rewrittenBody)))
	}

	return true
}

func hasModelPrefix(model string, prefixes []string) bool {
	for _, prefix := range prefixes {
		prefix = strings.TrimSpace(prefix)
		if prefix != "" && strings.HasPrefix(strings.TrimPrefix(model, "openai."), strings.TrimPrefix(prefix, "openai.")) {
			return true
		}
	}

	return false
}
