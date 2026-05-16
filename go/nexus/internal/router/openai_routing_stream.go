package router

import (
	"fmt"
	"io"
	"strings"

	"github.com/bytedance/sonic"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *GenericRouter) writeChatStreamAsResponses(
	w io.Writer,
	ctx *schemas.BifrostContext,
	config RouteConfig,
	chat *schemas.BifrostChatResponse,
) error {
	if config.StreamConfig == nil || config.StreamConfig.ResponsesStreamResponseConverter == nil {
		return fmt.Errorf("responses stream converter is not configured")
	}

	state := chatToResponsesStreamState(ctx)
	for _, responsesChunk := range chat.ToBifrostResponsesStreamResponse(state) {
		if responsesChunk == nil {
			continue
		}

		eventType, converted, err := config.StreamConfig.ResponsesStreamResponseConverter(ctx, responsesChunk)
		if err != nil {
			return err
		}
		if converted == nil {
			continue
		}
		if err := writeStreamSSE(w, eventType, converted); err != nil {
			return err
		}
	}

	return nil
}

func (in *GenericRouter) convertResponsesStreamChunkToChat(
	ctx *schemas.BifrostContext,
	config RouteConfig,
	responsesChunk *schemas.BifrostResponsesStreamResponse,
) (string, interface{}, error) {
	if config.StreamConfig == nil || config.StreamConfig.ChatStreamResponseConverter == nil {
		return "", nil, fmt.Errorf("chat stream converter is not configured")
	}

	chatChunk := responsesChunk.ToBifrostChatResponse()
	if chatChunk == nil {
		return "", nil, nil
	}

	return config.StreamConfig.ChatStreamResponseConverter(ctx, chatChunk)
}

func writeStreamSSE(w io.Writer, eventType string, convertedResponse interface{}) error {
	if eventType != "" {
		if _, err := fmt.Fprintf(w, "event: %s\n", eventType); err != nil {
			return err
		}
	}

	switch sse := convertedResponse.(type) {
	case string:
		if !strings.HasPrefix(sse, "data: ") && !strings.HasPrefix(sse, "event: ") {
			sse = fmt.Sprintf("data: %s\n\n", sse)
		}
		if _, err := fmt.Fprint(w, sse); err != nil {
			return err
		}
	default:
		responseJSON, err := sonic.Marshal(convertedResponse)
		if err != nil {
			return err
		}
		if _, err := fmt.Fprintf(w, "data: %s\n\n", responseJSON); err != nil {
			return err
		}
	}

	return nil
}
