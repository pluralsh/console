package clients

import "testing"

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
