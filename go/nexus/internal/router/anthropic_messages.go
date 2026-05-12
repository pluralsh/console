package router

import (
	"errors"
	"net/http"
	"strings"

	"github.com/bytedance/sonic"
	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *AnthropicRouter) newMessagesRoute() RouteConfig {
	return RouteConfig{
		Path:                       routeAnthropicMessages,
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.messagesRequestTypeInstance,
		RequestConverter:           in.messagesRequestConverter,
		ResponsesResponseConverter: in.messagesResponseConverter,
		ErrorConverter:             in.anthropicErrorConverter,
		SendDoneMarker:             new(false),
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: in.messagesStreamResponseConverter,
			ErrorConverter:                   in.anthropicStreamErrorConverter,
		},
	}
}

func (in *AnthropicRouter) messagesRequestTypeInstance() interface{} {
	return &anthropic.AnthropicMessageRequest{}
}

func (in *AnthropicRouter) messagesRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	anthropicReq, ok := req.(*anthropic.AnthropicMessageRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	bifrostReq := anthropicReq.ToBifrostResponsesRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	return &schemas.BifrostRequest{ResponsesRequest: bifrostReq}, nil
}

func (in *AnthropicRouter) messagesResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
	return anthropic.ToAnthropicResponsesResponse(ctx, resp), nil
}

func (in *AnthropicRouter) messagesStreamResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
	events := anthropic.ToAnthropicResponsesStreamResponse(ctx, resp)
	if len(events) == 0 {
		return "", nil, nil
	}

	sse, err := in.toAnthropicSSE(events)
	if err != nil {
		return "", nil, err
	}

	return "", sse, nil
}

func (in *AnthropicRouter) toAnthropicSSE(events []*anthropic.AnthropicStreamEvent) (string, error) {
	var sb strings.Builder
	for _, event := range events {
		if event == nil || event.Type == "" {
			continue
		}

		eventData, err := sonic.Marshal(event)
		if err != nil {
			return "", err
		}

		sb.WriteString("event: ")
		sb.WriteString(string(event.Type))
		sb.WriteString("\n")
		sb.WriteString("data: ")
		sb.Write(eventData)
		sb.WriteString("\n\n")
	}

	return sb.String(), nil
}
