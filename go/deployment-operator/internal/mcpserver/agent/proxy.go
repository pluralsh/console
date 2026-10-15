package agent

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// newBearerTokenProxy forwards requests to upstreamURL with token instead of the caller's credentials.
// subpath, when set, returns the part of the request path appended to upstreamURL's path; otherwise
// every request goes to upstreamURL's path.
func newBearerTokenProxy(upstreamURL string, token func() string, subpath func(*http.Request) string) (http.Handler, error) {
	target, err := url.Parse(upstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q", upstreamURL)
	}
	if token == nil || strings.TrimSpace(token()) == "" {
		return nil, fmt.Errorf("bearer token proxy requires a token")
	}
	base := strings.TrimSuffix(target.Path, "/")

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			request.SetURL(target)
			request.SetXForwarded()
			request.Out.URL.Path = target.Path
			request.Out.URL.RawPath = target.RawPath
			if subpath != nil {
				request.Out.URL.Path = base + "/" + subpath(request.In)
				request.Out.URL.RawPath = ""
			}
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

// withBearerToken replaces the caller's credentials with the deploy token before calling next.
func withBearerToken(token func() string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setBearerToken(r.Header, token())
		next.ServeHTTP(w, r)
	})
}
