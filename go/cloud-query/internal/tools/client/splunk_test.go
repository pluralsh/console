package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func TestSplunkClientTokenRealm(t *testing.T) {
	t.Parallel()

	for _, test := range []struct {
		name      string
		tokenType toolquery.SplunkTokenType
		wantAuth  string
	}{
		{name: "defaults to bearer", tokenType: toolquery.SplunkTokenType_BEARER, wantAuth: "Bearer test-token"},
		{name: "uses splunk", tokenType: toolquery.SplunkTokenType_SPLUNK, wantAuth: "Splunk test-token"},
	} {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if got := r.Header.Get("Authorization"); got != test.wantAuth {
					t.Errorf("Authorization = %q, want %q", got, test.wantAuth)
				}
				_, _ = w.Write([]byte(`{"preview":false}`))
			}))
			defer server.Close()

			splunk := NewSplunkClient(server.URL, "test-token", test.tokenType, "", "")
			defer splunk.Close()

			if _, err := splunk.ExportSearch(context.Background(), url.Values{"search": {"search *"}}); err != nil {
				t.Fatalf("ExportSearch() error = %v", err)
			}
		})
	}
}

func TestNormalizeSplunkURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		rawURL       string
		wantURL      string
		wantInsecure bool
	}{
		{
			name:         "url without query",
			rawURL:       "https://localhost:8089",
			wantURL:      "https://localhost:8089",
			wantInsecure: false,
		},
		{
			name:         "insecure skip verify enabled and removed from url",
			rawURL:       "https://localhost:8089?insecure_skip_verify=true",
			wantURL:      "https://localhost:8089",
			wantInsecure: true,
		},
		{
			name:         "existing query preserved",
			rawURL:       "https://localhost:8089?foo=bar&insecure_skip_verify=1",
			wantURL:      "https://localhost:8089?foo=bar",
			wantInsecure: true,
		},
		{
			name:         "invalid url falls back",
			rawURL:       "://bad-url/",
			wantURL:      "://bad-url",
			wantInsecure: false,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotURL, gotInsecure := normalizeSplunkURL(tt.rawURL)
			if gotURL != tt.wantURL {
				t.Fatalf("normalizeSplunkURL() url = %q, want %q", gotURL, tt.wantURL)
			}
			if gotInsecure != tt.wantInsecure {
				t.Fatalf("normalizeSplunkURL() insecure = %t, want %t", gotInsecure, tt.wantInsecure)
			}
		})
	}
}
