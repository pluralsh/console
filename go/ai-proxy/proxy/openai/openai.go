package openai

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/andybalholm/brotli"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

const headerContentEncoding = "Content-Encoding"

type OpenAIProxy struct {
	proxy *httputil.ReverseProxy
	token string
}

func (o *OpenAIProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		o.proxy.ServeHTTP(w, r)
	}
}

func NewOpenAIStandardProxy(host, token string) (api.OpenAIProxy, error) {
	parsedURL, err := url.Parse(host)
	if err != nil {
		return nil, err
	}

	reverse := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.Header.Set("Authorization", "Bearer "+token)

			r.SetXForwarded()

			targetURL, err := url.Parse(openai.EndpointChat)
			if err != nil {
				klog.ErrorS(err, "failed to parse target url")
				return
			}

			r.Out.URL.Scheme = parsedURL.Scheme
			r.Out.URL.Host = parsedURL.Host
			r.Out.Host = parsedURL.Host
			r.Out.URL.Path = targetURL.Path

			klog.V(log.LogLevelDebug).InfoS(
				"proxying request",
				"from", fmt.Sprintf("%s %s", r.In.Method, r.In.URL.Path),
				"to", r.Out.URL.String(),
			)
		},

		ModifyResponse: func(resp *http.Response) error {
			contentEncoding := resp.Header.Get(headerContentEncoding)
			if contentEncoding == "" {
				return nil
			}

			var reader io.Reader
			switch strings.TrimSpace(contentEncoding) {
			case "br":
				resp.Header.Del(headerContentEncoding)
				reader = brotli.NewReader(resp.Body)
			case "gzip":
				resp.Header.Del(headerContentEncoding)
				gzr, err := gzip.NewReader(resp.Body)
				if err != nil {
					return err
				}
				reader = gzr
			default:
				return nil
			}

			decompressed, err := io.ReadAll(reader)
			if err != nil {
				return err
			}

			resp.Body = io.NopCloser(bytes.NewReader(decompressed))
			resp.ContentLength = int64(len(decompressed))

			return nil
		},
	}

	return &OpenAIProxy{
		proxy: reverse,
		token: token,
	}, nil
}
