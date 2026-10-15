package agent

import (
	"net/http"
	"strings"
)

// newConsoleAIProxy forwards <prefix><rest> to <upstreamURL>/<rest>, authenticating with token so the
// agent never holds it. Only paths under upstreamURL are reachable.
func newConsoleAIProxy(prefix, upstreamURL string, token func() string) (http.Handler, error) {
	proxy, err := newTokenProxy(upstreamURL, "Bearer", token, func(r *http.Request) string {
		return strings.TrimPrefix(r.URL.Path, prefix)
	})
	if err != nil {
		return nil, err
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
