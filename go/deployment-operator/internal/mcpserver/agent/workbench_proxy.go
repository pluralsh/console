package agent

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

func newBearerTokenProxy(upstreamURL string, token func() string) (http.Handler, error) {
	target, err := url.Parse(upstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q", upstreamURL)
	}
	if token == nil || strings.TrimSpace(token()) == "" {
		return nil, fmt.Errorf("bearer token proxy requires a token")
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			request.SetURL(target)
			request.SetXForwarded()
			request.Out.URL.Path = target.Path
			request.Out.URL.RawPath = target.RawPath
			request.Out.Host = target.Host
			setBearerToken(request.Out.Header, token())
		},
	}
	return proxy, nil
}

// setBearerToken drops every credential the caller sent and authenticates with token instead.
func setBearerToken(header http.Header, token string) {
	header.Del("Cookie")
	header.Del("Proxy-Authorization")
	header.Del("X-Api-Key")
	header.Set("Authorization", "Bearer "+token)
}
