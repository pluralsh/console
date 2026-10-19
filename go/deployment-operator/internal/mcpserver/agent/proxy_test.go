package agent

import (
	"bufio"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// TestTokenProxiesReplaceCallerCredentials sends every way a caller could smuggle credentials or
// forwarding headers past the AI and workbench proxies and checks only the injected token arrives.
func TestTokenProxiesReplaceCallerCredentials(t *testing.T) {
	var received http.Header
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Header.Clone()
		http.SetCookie(w, &http.Cookie{Name: "session", Value: "upstream-secret"})
		_, _ = w.Write([]byte("ok"))
	}))
	defer upstream.Close()

	srv := NewServer(nil,
		WithConsoleAIProxy(upstream.URL+"/ext/ai", func() string { return "deploy-token" }),
		WithWorkbenchMCPProxy(upstream.URL+"/mcp/workbench/id", func() string { return "user-token" }),
	)
	sidecar := httptest.NewServer(srv.httpServer.Handler)
	defer sidecar.Close()

	cases := map[string]struct {
		path      string
		wantToken string
	}{
		"ai proxy":        {path: common.AgentConsoleAIPath + "v1/chat/completions", wantToken: "Bearer deploy-token"},
		"workbench proxy": {path: common.AgentWorkbenchMCPPath, wantToken: "Bearer user-token"},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			received = nil
			request, _ := http.NewRequest(http.MethodPost, sidecar.URL+tc.path, strings.NewReader("{}"))
			request.Header.Add("Authorization", "Bearer agent-one")
			request.Header.Add("Authorization", "Bearer agent-two")
			request.Header.Set("Proxy-Authorization", "Basic agent")
			request.Header.Set("X-Api-Key", "agent-key")
			request.Header.Set("Cookie", "session=agent")
			request.Header.Set("Forwarded", "for=10.0.0.1;host=evil.example")
			request.Header.Set("X-Forwarded-For", "10.0.0.1")
			request.Header.Set("X-Forwarded-Host", "evil.example")
			// Naming Authorization as hop-by-hop must not strip the injected token.
			request.Header.Set("Connection", "Authorization")

			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			_ = response.Body.Close()

			if response.StatusCode != http.StatusOK || received == nil {
				t.Fatalf("status = %d, upstream reached = %v", response.StatusCode, received != nil)
			}
			if got := received.Values("Authorization"); len(got) != 1 || got[0] != tc.wantToken {
				t.Fatalf("authorization = %q, want only %q", got, tc.wantToken)
			}
			for _, header := range []string{"Proxy-Authorization", "X-Api-Key", "Cookie", "Forwarded"} {
				if got := received.Get(header); got != "" {
					t.Errorf("%s reached upstream: %q", header, got)
				}
			}
			if got := received.Get("X-Forwarded-For"); got != "127.0.0.1" {
				t.Errorf("X-Forwarded-For = %q, want only the sidecar's caller", got)
			}
			if got := received.Get("X-Forwarded-Host"); got == "evil.example" {
				t.Errorf("caller's X-Forwarded-Host reached upstream")
			}
			if got := response.Header.Values("Set-Cookie"); len(got) != 0 {
				t.Errorf("upstream cookie reached the caller: %q", got)
			}
		})
	}
}

func TestConsoleAIProxyKeepsOddPathsUnderAI(t *testing.T) {
	var path, host string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path, host = r.URL.Path, r.Host
	}))
	defer upstream.Close()
	upstreamHost := strings.TrimPrefix(upstream.URL, "http://")

	handler, err := newConsoleAIProxy(common.AgentConsoleAIPath, upstream.URL+"/ext/ai", func() string { return "plural-token" })
	if err != nil {
		t.Fatal(err)
	}

	// These pass the dot-segment check, so they must reach Console as plain paths under /ext/ai.
	for _, target := range []string{
		common.AgentConsoleAIPath + "%252e%252e/gql",
		common.AgentConsoleAIPath + "/evil.example/v1",
	} {
		path, host = "", ""
		handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "http://127.0.0.1"+target, nil))
		if !strings.HasPrefix(path, "/ext/ai/") || host != upstreamHost {
			t.Errorf("%s reached %s%s, want a path under %s/ext/ai/", target, host, path, upstreamHost)
		}
	}
}

func TestConsoleAIProxyStreamsEvents(t *testing.T) {
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = w.Write([]byte("data: one\n\n"))
		w.(http.Flusher).Flush()
		<-release
		_, _ = w.Write([]byte("data: two\n\n"))
	}))
	defer upstream.Close()
	defer close(release)

	srv := NewServer(nil, WithConsoleAIProxy(upstream.URL+"/ext/ai", func() string { return "plural-token" }))
	sidecar := httptest.NewServer(srv.httpServer.Handler)
	defer sidecar.Close()

	response, err := http.Post(sidecar.URL+common.AgentConsoleAIPath+"v1/messages", "application/json", strings.NewReader("{}"))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	// The first event must arrive while upstream is still holding the stream open.
	line := make(chan string, 1)
	go func() {
		first, _ := bufio.NewReader(response.Body).ReadString('\n')
		line <- first
	}()
	select {
	case got := <-line:
		if got != "data: one\n" {
			t.Fatalf("first line = %q", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the proxy buffered the event stream")
	}
}
