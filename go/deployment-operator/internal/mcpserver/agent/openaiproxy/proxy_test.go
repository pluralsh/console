package openaiproxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlersDropUpstreamCookies(t *testing.T) {
	t.Parallel()

	newChat := func(url string) (http.Handler, error) { return NewHandler(Config{UpstreamURL: url}) }
	newResponses := func(url string) (http.Handler, error) { return NewResponsesHandler(ResponsesConfig{UpstreamURL: url}) }

	for handlerName, newHandler := range map[string]func(string) (http.Handler, error){"chat": newChat, "responses": newResponses} {
		for path, tc := range map[string]struct {
			stream bool
			status int
		}{
			"non-streaming":    {stream: false, status: http.StatusOK},
			"failed streaming": {stream: true, status: http.StatusUnauthorized},
		} {
			t.Run(handlerName+"/"+path, func(t *testing.T) {
				t.Parallel()
				upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Set-Cookie", "session=deploy-token")
					w.Header().Set("X-Upstream", "ok")
					w.WriteHeader(tc.status)
					_, _ = w.Write([]byte(`{}`))
				}))
				defer upstream.Close()

				handler, err := newHandler(upstream.URL)
				if err != nil {
					t.Fatal(err)
				}
				body := `{"model":"gpt-4","stream":false}`
				if tc.stream {
					body = `{"model":"gpt-4","stream":true}`
				}
				rec := httptest.NewRecorder()
				handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))

				if rec.Code != tc.status {
					t.Fatalf("status = %d, want %d", rec.Code, tc.status)
				}
				if got := rec.Header().Values("Set-Cookie"); len(got) != 0 {
					t.Fatalf("Set-Cookie reached the caller: %q", got)
				}
				if rec.Header().Get("X-Upstream") != "ok" {
					t.Fatalf("other upstream headers were dropped")
				}
			})
		}
	}
}
