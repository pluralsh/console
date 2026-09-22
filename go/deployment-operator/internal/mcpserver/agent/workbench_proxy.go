package agent

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

func newWorkbenchMCPProxy(upstreamURL string, token func() string) (http.Handler, error) {
	target, err := url.Parse(upstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid workbench MCP URL %q", upstreamURL)
	}
	if token == nil || strings.TrimSpace(token()) == "" {
		return nil, fmt.Errorf("workbench MCP proxy requires a bearer token")
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			request.SetURL(target)
			request.SetXForwarded()
			request.Out.URL.Path = target.Path
			request.Out.URL.RawPath = target.RawPath
			request.Out.Host = target.Host
			request.Out.Header.Del("Cookie")
			request.Out.Header.Del("Proxy-Authorization")
			request.Out.Header.Set("Authorization", "Bearer "+token())
		},
	}
	return proxy, nil
}
