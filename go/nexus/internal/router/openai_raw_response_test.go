package router

import (
	"context"
	"testing"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/stretchr/testify/require"
)

func TestOpenAIRawResponsePassthrough(t *testing.T) {
	t.Parallel()

	raw := map[string]any{"id": "upstream"}
	chatResp := &schemas.BifrostChatResponse{
		ExtraFields: schemas.BifrostResponseExtraFields{
			Provider:    schemas.OpenAI,
			RawResponse: raw,
		},
	}
	responsesResp := &schemas.BifrostResponsesResponse{
		ExtraFields: schemas.BifrostResponseExtraFields{
			Provider:    schemas.OpenAI,
			RawResponse: raw,
		},
	}
	responsesStreamResp := &schemas.BifrostResponsesStreamResponse{
		ExtraFields: schemas.BifrostResponseExtraFields{
			Provider:    schemas.OpenAI,
			RawResponse: raw,
		},
	}

	newCtx := func() *schemas.BifrostContext {
		ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
		return ctx
	}

	t.Run("native chat passthrough", func(t *testing.T) {
		t.Parallel()
		ctx := newCtx()
		got, ok := openaiChatRawResponse(ctx, chatResp)
		require.True(t, ok)
		require.Equal(t, raw, got)
	})

	t.Run("chat via responses skips passthrough", func(t *testing.T) {
		t.Parallel()
		ctx := newCtx()
		ctx.SetValue(schemas.BifrostContextKeyChangeRequestType, schemas.ResponsesRequest)
		_, ok := openaiChatRawResponse(ctx, chatResp)
		require.False(t, ok)
	})

	t.Run("native responses passthrough", func(t *testing.T) {
		t.Parallel()
		ctx := newCtx()
		got, ok := openaiResponsesRawResponse(ctx, responsesResp)
		require.True(t, ok)
		require.Equal(t, raw, got)
	})

	t.Run("responses via chat skips passthrough", func(t *testing.T) {
		t.Parallel()
		ctx := newCtx()
		ctx.SetValue(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback, true)
		_, ok := openaiResponsesRawResponse(ctx, responsesResp)
		require.False(t, ok)
	})

	t.Run("responses stream via chat skips passthrough", func(t *testing.T) {
		t.Parallel()
		ctx := newCtx()
		ctx.SetValue(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback, true)
		_, ok := openaiResponsesStreamRawResponse(ctx, responsesStreamResp)
		require.False(t, ok)
	})
}

func TestApplyOpenAIRoutingContext(t *testing.T) {
	t.Parallel()

	t.Run("chat via responses sets bifrost change type", func(t *testing.T) {
		t.Parallel()
		ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
		policy := openAIHTTPPolicy{allowChat: false, allowResponses: true}
		applyOpenAIRoutingContext(ctx, string(RouteChatCompletions), policy)
		require.True(t, chatViaResponses(ctx))
	})

	t.Run("responses via chat sets bifrost fallback flag", func(t *testing.T) {
		t.Parallel()
		ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
		policy := openAIHTTPPolicy{allowChat: true, allowResponses: false}
		applyOpenAIRoutingContext(ctx, string(RouteResponses), policy)
		require.True(t, responsesViaChat(ctx))
	})
}
