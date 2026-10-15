package agent

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// newConsoleAIProxy forwards <prefix><rest> to <upstreamURL>/<rest>, authenticating with token so the
// agent never holds it. Only paths under upstreamURL are reachable.
func newConsoleAIProxy(prefix, upstreamURL string, token func() string) (http.Handler, error) {
	target, err := url.Parse(upstreamURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q", upstreamURL)
	}
	if token == nil {
		return nil, fmt.Errorf("console ai proxy requires a token")
	}
	base := strings.TrimSuffix(target.Path, "/")

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			rest := strings.TrimPrefix(request.In.URL.Path, prefix)
			request.SetURL(target)
			request.SetXForwarded()
			request.Out.URL.Path = base + "/" + rest
			request.Out.URL.RawPath = ""
			request.Out.Host = target.Host
			setBearerToken(request.Out.Header, token())
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rest, ok := strings.CutPrefix(r.URL.Path, prefix)
		if !ok || hasDotSegment(rest) {
			http.Error(w, "path is not allowed", http.StatusForbidden)
			return
		}
		proxy.ServeHTTP(w, r)
	}), nil
}

func hasDotSegment(path string) bool {
	for _, segment := range strings.Split(path, "/") {
		if segment == "." || segment == ".." {
			return true
		}
	}
	return false
}

// withBearerToken replaces the caller's credentials with the deploy token before calling next.
func withBearerToken(token func() string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setBearerToken(r.Header, token())
		next.ServeHTTP(w, r)
	})
}
