package openai

import (
	"fmt"
	"net/http/httputil"
	"net/url"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

const (
	embeddingsEndpoint = "/v1/embeddings"
)

func NewOpenAIEmbeddingsProxy(host, token string) (api.OpenAIProxy, error) {
	parsedURL, err := url.Parse(host)
	if err != nil {
		return nil, err
	}

	reverse := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.Header.Set("Authorization", "Bearer "+token)

			r.SetXForwarded()

			targetURL, err := url.Parse(embeddingsEndpoint)
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
	}

	return &OpenAIProxy{
		proxy: reverse,
		token: token,
	}, nil
}
