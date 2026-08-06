package openai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"strings"

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

	reverse := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetXForwarded()

			targetPath := openai.EndpointChatCompletions
			if r.In.URL.Path == openai.EndpointResponses {
				targetPath = "/v1/responses"
			}

			target := parsedURL
			token := tokenRotator.GetNextToken()
			upstreamPath := targetPath
			if mantleConfig.Enabled() && routeToMantle(r, mantleConfig.ModelPrefixes) {
				target.Scheme = "https"
				target.Host = fmt.Sprintf("bedrock-mantle.%s.api.aws", mantleConfig.AWSRegion)
				target.Path = "/openai/v1"
				token = mantleConfig.APIKey
				upstreamPath = strings.TrimRight(target.Path, "/") + strings.TrimPrefix(targetPath, "/v1")
			}

			r.Out.Header.Set("Authorization", "Bearer "+token)
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
