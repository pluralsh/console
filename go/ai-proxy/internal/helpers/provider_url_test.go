package helpers

import (
	"testing"
)

func TestParseProviderBaseURL(t *testing.T) {
	cases := []struct {
		in       string
		wantHost string
		wantSch  string
	}{
		{"https://api.openai.com", "api.openai.com", "https"},
		{"http://127.0.0.1:8081", "127.0.0.1:8081", "http"},
		{"localhost:8081", "localhost:8081", "http"},
		{"127.0.0.1:9999", "127.0.0.1:9999", "http"},
		{"api.openai.com", "api.openai.com", "https"},
	}
	for _, tc := range cases {
		t.Run(tc.in, func(t *testing.T) {
			u, err := ParseProviderBaseURL(tc.in)
			if err != nil {
				t.Fatal(err)
			}
			if u.Scheme != tc.wantSch {
				t.Errorf("scheme: want %q got %q", tc.wantSch, u.Scheme)
			}
			if u.Host != tc.wantHost {
				t.Errorf("host: want %q got %q", tc.wantHost, u.Host)
			}
		})
	}
}
