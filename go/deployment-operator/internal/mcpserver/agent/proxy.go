package agent

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// newTokenProxy forwards requests to upstreamURL with "<scheme> <token>" instead of the caller's
// credentials, and drops upstream cookies so nothing upstream sets reaches the caller. subpath, when set, returns the part of the request path appended to upstreamURL's path; otherwise
// every request goes to upstreamURL's path.
func newTokenProxy(upstreamURL, scheme string, token func() string, subpath func(*http.Request) string) (http.Handler, error) {
	target, err := url.Parse(upstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q", upstreamURL)
	}
	if token == nil || strings.TrimSpace(token()) == "" {
		return nil, fmt.Errorf("token proxy requires a token")
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
			setToken(request.Out.Header, scheme, token())
		},
		ModifyResponse: func(response *http.Response) error {
			response.Header.Del("Set-Cookie")
			return nil
		},
	}
	return proxy, nil
}

// setToken drops every credential the caller sent and authenticates with "<scheme> <token>" instead.
func setToken(header http.Header, scheme, token string) {
	header.Del("Cookie")
	header.Del("Proxy-Authorization")
	header.Del("X-Api-Key")
	header.Set("Authorization", scheme+" "+token)
}

// withBearerToken replaces the caller's credentials with the deploy token before calling next.
func withBearerToken(token func() string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setToken(r.Header, "Bearer", token())
		next.ServeHTTP(w, r)
	})
}
