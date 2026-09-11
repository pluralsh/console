package router

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/tidwall/sjson"
)

const (
	openAIResponsesStreamErrorMessage = "An internal error occurred while processing your request."
	openAIResponsesStreamErrorCode    = "server_error"
	openAIResponsesStreamFailedStatus = "failed"
)

type openAIResponsesStreamFailure struct {
	Type           schemas.ResponsesStreamResponseType `json:"type"`
	SequenceNumber int                                 `json:"sequence_number"`
	Response       openAIResponsesFailedResponse       `json:"response"`
}

type openAIResponsesFailedResponse struct {
	Object string                           `json:"object"`
	Status string                           `json:"status"`
	Error  openAIResponsesFailedErrorDetail `json:"error"`
}

type openAIResponsesFailedErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type openAIResponsesRequest struct {
	request *openai.OpenAIResponsesRequest
	rawBody []byte
}

func (in *OpenAIRouter) newResponsesRoute() RouteConfig {
	return RouteConfig{
		Path:                       string(RouteResponses),
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.responsesRequestTypeInstance,
		RequestParser:              in.responsesRequestParser,
		RequestConverter:           in.responsesRequestConverter,
		ResponsesResponseConverter: in.responsesResponseConverter,
		ErrorConverter:             in.errorConverter,
		PreCallback:                in.openAIRoutePreCallback(string(RouteResponses)),
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: in.responsesStreamResponseConverter,
			ErrorConverter:                   in.responsesStreamErrorConverter,
		},
	}
}

func (in *OpenAIRouter) responsesRequestTypeInstance() interface{} {
	return &openAIResponsesRequest{request: &openai.OpenAIResponsesRequest{}}
}

func (in *OpenAIRouter) responsesRequestParser(request *http.Request, target interface{}) error {
	responsesRequest, ok := target.(*openAIResponsesRequest)
	if !ok {
		return errors.New("invalid request type")
	}

	rawBody, err := io.ReadAll(request.Body)
	if err != nil {
		return err
	}
	if len(rawBody) == 0 {
		return nil
	}
	if err := sonic.Unmarshal(rawBody, responsesRequest.request); err != nil {
		return err
	}
	responsesRequest.rawBody = rawBody

	return nil
}

func (in *OpenAIRouter) responsesRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	responsesRequest, ok := req.(*openAIResponsesRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}
	openaiReq := responsesRequest.request
	if openaiReq == nil {
		return nil, errors.New("invalid request type")
	}

	provider, model, _, err := in.resolveModel(ctx, openaiReq.Model)
	if err != nil {
		return nil, err
	}

	bifrostReq := openaiReq.ToBifrostResponsesRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	bifrostReq.Provider = provider
	bifrostReq.Model = model

	if responsesViaChat(ctx) {
		chatReq := bifrostReq.ToChatRequest()
		chatReq.Provider = provider
		chatReq.Model = model
		return &schemas.BifrostRequest{ChatRequest: chatReq}, nil
	}
	// Bifrost's typed Responses schema can drop newer native fields such as additional_tools.
	// Preserve native OpenAI payloads; fallback and cross-provider conversions stay typed.
	if provider == schemas.OpenAI && len(bifrostReq.Fallbacks) == 0 && len(responsesRequest.rawBody) > 0 {
		rawBody, err := sjson.SetBytes(responsesRequest.rawBody, "model", model)
		if err != nil {
			return nil, fmt.Errorf("failed to update raw request model: %w", err)
		}
		rawBody, err = sjson.DeleteBytes(rawBody, "fallbacks")
		if err != nil {
			return nil, fmt.Errorf("failed to remove raw request fallbacks: %w", err)
		}
		bifrostReq.RawRequestBody = rawBody
		ctx.SetValue(schemas.BifrostContextKeyUseRawRequestBody, true)
		ctx.SetValue(schemas.BifrostContextKeyAllowPerRequestRawOverride, true)
		ctx.SetValue(schemas.BifrostContextKeySendBackRawResponse, true)
	}

	return &schemas.BifrostRequest{ResponsesRequest: bifrostReq}, nil
}

func (in *openAIResponsesRequest) IsStreamingRequested() bool {
	return in.request != nil && in.request.IsStreamingRequested()
}

func (in *OpenAIRouter) responsesResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
	if raw, ok := openaiResponsesRawResponse(ctx, resp); ok {
		return raw, nil
	}

	return resp, nil
}

func (in *OpenAIRouter) responsesStreamResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
	if raw, ok := openaiResponsesStreamRawResponse(ctx, resp); ok {
		return string(resp.Type), raw, nil
	}

	return string(resp.Type), resp, nil
}

func (in *OpenAIRouter) responsesStreamErrorConverter(_ *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
	message := openAIResponsesStreamErrorMessage
	code := openAIResponsesStreamErrorCode
	if err == nil || err.Error == nil {
		return in.openAIResponsesStreamFailure(message, code)
	}

	if err.Error.Message != "" {
		message = err.Error.Message
	}
	if err.Error.Code != nil && *err.Error.Code != "" {
		code = *err.Error.Code
	} else if err.Type != nil && *err.Type != "" {
		code = *err.Type
	}

	return in.openAIResponsesStreamFailure(message, code)
}

// openAIResponsesStreamFailure preserves upstream failures for Responses clients without fabricating a full response.
func (in *OpenAIRouter) openAIResponsesStreamFailure(message, code string) *openAIResponsesStreamFailure {
	return &openAIResponsesStreamFailure{
		Type:           schemas.ResponsesStreamResponseTypeFailed,
		SequenceNumber: 0,
		Response: openAIResponsesFailedResponse{
			Object: "response",
			Status: openAIResponsesStreamFailedStatus,
			Error: openAIResponsesFailedErrorDetail{
				Code:    code,
				Message: message,
			},
		},
	}
}
