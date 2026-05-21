package router

import (
	"net/http"
	"testing"

	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/stretchr/testify/require"
)

func TestDisableProviderStreamingPreCallback(t *testing.T) {
	cb := disableProviderStreamingPreCallback()

	t.Run("no header leaves stream unset", func(t *testing.T) {
		req := &anthropic.AnthropicMessageRequest{}
		stream := true
		req.Stream = &stream
		err := cb(&http.Request{Header: http.Header{}}, nil, req)
		require.NoError(t, err)
		require.True(t, *req.Stream)
	})

	t.Run("false header clears anthropic stream", func(t *testing.T) {
		req := &anthropic.AnthropicMessageRequest{}
		stream := true
		req.Stream = &stream
		r, _ := http.NewRequest(http.MethodPost, "http://example.com", nil)
		r.Header.Set(PluralEnableStreamHeader, "false")
		err := cb(r, nil, req)
		require.NoError(t, err)
		require.False(t, *req.Stream)
	})

	t.Run("false header clears openai responses stream", func(t *testing.T) {
		req := &openai.OpenAIResponsesRequest{}
		stream := true
		req.Stream = &stream
		r, _ := http.NewRequest(http.MethodPost, "http://example.com", nil)
		r.Header.Set(PluralEnableStreamHeader, "false")
		err := cb(r, nil, req)
		require.NoError(t, err)
		require.False(t, *req.Stream)
	})
}
