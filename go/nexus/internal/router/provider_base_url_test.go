package router

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBifrostNetworkBaseURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: ""},
		{name: "openai default style", in: "https://api.openai.com/v1", want: "https://api.openai.com"},
		{name: "litellm proxy", in: "https://litellm.example/v1", want: "https://litellm.example"},
		{name: "trailing slash", in: "https://litellm.example/v1/", want: "https://litellm.example"},
		{name: "already host level", in: "https://api.openai.com", want: "https://api.openai.com"},
		{name: "ai-proxy fixture", in: "http://ai-proxy.ai-proxy:8000/openai/v1", want: "http://ai-proxy.ai-proxy:8000/openai"},
		{name: "whitespace", in: "  https://api.openai.com/v1  ", want: "https://api.openai.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tt.want, bifrostNetworkBaseURL(tt.in))
		})
	}
}
