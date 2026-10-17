package router

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/maximhq/bifrost/core/providers/bedrock"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/stretchr/testify/require"
)

func TestRequestContextStripsTrailingAssistantForBedrockClaude(t *testing.T) {
	t.Parallel()

	request := func() *schemas.BifrostResponsesRequest {
		return &schemas.BifrostResponsesRequest{
			Provider: schemas.Bedrock,
			Model:    "us.anthropic.claude-opus-4-6-v1:0",
			Input: []schemas.ResponsesMessage{
				responsesMessage(schemas.ResponsesInputMessageRoleUser, "write the report"),
				responsesMessage(schemas.ResponsesInputMessageRoleAssistant, "Let me compile and publish the report."),
			},
		}
	}

	t.Run("nexus request context", func(t *testing.T) {
		ctx, cancel := newRequestContext(httptest.NewRequest("POST", "/v1/responses", nil))
		defer cancel()

		converted, err := bedrock.ToBedrockResponsesRequest(ctx, request())
		require.NoError(t, err)
		require.Len(t, converted.Messages, 1)
		require.Equal(t, bedrock.BedrockMessageRoleUser, converted.Messages[0].Role)
	})

	t.Run("bare bifrost context forwards the prefill", func(t *testing.T) {
		ctx, cancel := schemas.NewBifrostContextWithCancel(context.Background())
		defer cancel()

		converted, err := bedrock.ToBedrockResponsesRequest(ctx, request())
		require.NoError(t, err)
		require.Len(t, converted.Messages, 2)
		require.Equal(t, bedrock.BedrockMessageRoleAssistant, converted.Messages[1].Role)
	})
}

func responsesMessage(role schemas.ResponsesMessageRoleType, text string) schemas.ResponsesMessage {
	msgType := schemas.ResponsesMessageTypeMessage
	return schemas.ResponsesMessage{
		Type:    &msgType,
		Role:    &role,
		Content: &schemas.ResponsesMessageContent{ContentStr: &text},
	}
}
