package provider

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
)

type OpenAIStandardProxy struct {
	proxy *httputil.ReverseProxy
}

func (o *OpenAIStandardProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		o.proxy.ServeHTTP(w, r)
	}
}

func NewOpenAIStandardProxy(host string) (api.OpenAIProxy, error) {
	parsedURL, err := url.Parse(host)
	if err != nil {
		return nil, err
	}

	reverse := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			klog.Infof("Forwarding %s request to %s (original path: %s), headers: %v",
				req.Method,
				parsedURL.Host,
				req.URL.Path,
				req.Header,
			)

			req.URL.Scheme = parsedURL.Scheme
			req.URL.Host = parsedURL.Host
			req.URL.Path = openai.EndpointChat

			klog.Infof("New path %s", req.URL.Path)
		},
	}

	return &OpenAIStandardProxy{
		proxy: reverse,
	}, nil
}
