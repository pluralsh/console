package router

import (
	"net/http"
	"strings"

	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
)

// PluralEnableStreamHeader disables model-provider streaming when set to "false".
// Agent runtimes send this via ANTHROPIC_CUSTOM_HEADERS (Claude) or model provider
// http_headers in Codex config.toml when spec.config.*.disableStream is true.
const PluralEnableStreamHeader = "X-Plural-Enable-Stream"

func providerStreamingDisabled(r *http.Request) bool {
	v := strings.TrimSpace(r.Header.Get(PluralEnableStreamHeader))
	return strings.EqualFold(v, "false") || v == "0"
}

func chainPreCallbacks(callbacks ...PreRequestCallback) PreRequestCallback {
	return func(r *http.Request, ctx *schemas.BifrostContext, req interface{}) error {
		for _, cb := range callbacks {
			if cb == nil {
				continue
			}
			if err := cb(r, ctx, req); err != nil {
				return err
			}
		}
		return nil
	}
}

func disableProviderStreamingPreCallback() PreRequestCallback {
	return func(r *http.Request, _ *schemas.BifrostContext, req interface{}) error {
		if !providerStreamingDisabled(r) {
			return nil
		}

		streamOff := false
		switch t := req.(type) {
		case *anthropic.AnthropicMessageRequest:
			t.Stream = &streamOff
		case *openai.OpenAIChatRequest:
			t.Stream = &streamOff
		case *openai.OpenAIResponsesRequest:
			t.Stream = &streamOff
		}
		return nil
	}
}
