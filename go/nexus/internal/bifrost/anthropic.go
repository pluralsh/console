package bifrost

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

type AnthropicRouter struct {
	*GenericRouter
}

func (in *AnthropicRouter) newCompleteRoute() RouteConfig {
	return RouteConfig{
		Provider: ProviderAnthropic,
		Path:     "/v1/complete",
		Method:   http.MethodPost,
		GetRequestTypeInstance: func() interface{} {
			return &anthropic.AnthropicTextRequest{}
		},
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if anthropicReq, ok := req.(*anthropic.AnthropicTextRequest); ok {
				return &schemas.BifrostRequest{
					TextCompletionRequest: anthropicReq.ToBifrostTextCompletionRequest(),
				}, nil
			}

			return nil, errors.New("invalid request type")
		},
		TextResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostTextCompletionResponse) (interface{}, error) {
			return anthropic.ToAnthropicTextCompletionResponse(resp), nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return anthropic.ToAnthropicChatCompletionError(err)
		},
	}
}

func (in *AnthropicRouter) newMessagesRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderAnthropic,
		Path:                   "/v1/messages",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &anthropic.AnthropicMessageRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if anthropicReq, ok := req.(*anthropic.AnthropicMessageRequest); ok {
				return &schemas.BifrostRequest{
					ResponsesRequest: anthropicReq.ToBifrostResponsesRequest(ctx),
				}, nil
			}

			return nil, errors.New("invalid request type")
		},
		ResponsesResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
			return anthropic.ToAnthropicResponsesResponse(ctx, resp), nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return anthropic.ToAnthropicChatCompletionError(err)
		},
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
				anthropicResponse := anthropic.ToAnthropicResponsesStreamResponse(ctx, resp)
				switch {
				case len(anthropicResponse) > 1:
					combinedContent := ""
					for _, event := range anthropicResponse {
						responseJSON, err := json.Marshal(event)
						if err != nil {
							continue
						}

						combinedContent += fmt.Sprintf("event: %s\ndata: %s\n\n", event.Type, responseJSON)
					}
					return "", combinedContent, nil
				case len(anthropicResponse) == 1:
					return string(anthropicResponse[0].Type), anthropicResponse[0], nil
				default:
					return "", nil, nil
				}
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
		},
	}
}

// newFileRouteConfigs creates route configurations for Anthropic Files API endpoints.
func (in *AnthropicRouter) newFileRouteConfigs() []RouteConfig {
	return []RouteConfig{
		{
			Provider: ProviderAnthropic,
			Path:     "/v1/files",
			Method:   "POST",
			GetRequestTypeInstance: func() interface{} {
				return &anthropic.AnthropicFileUploadRequest{}
			},
			RequestParser: in.parseAnthropicFileUploadMultipartRequest,
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if uploadReq, ok := req.(*anthropic.AnthropicFileUploadRequest); ok {
					return &FileRequest{
						Type: schemas.FileUploadRequest,
						UploadRequest: &schemas.BifrostFileUploadRequest{
							File:     uploadReq.File,
							Filename: uploadReq.Filename,
							Purpose:  schemas.FilePurpose(uploadReq.Purpose),
							Provider: schemas.Anthropic,
						},
					}, nil
				}
				return nil, errors.New("invalid file upload request type")
			},
			FileUploadResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileUploadResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
				return anthropic.ToAnthropicFileUploadResponse(resp), nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return anthropic.ToAnthropicChatCompletionError(err)
			},
		},
		{
			Provider: ProviderAnthropic,
			Path:     "/v1/files",
			Method:   "GET",
			GetRequestTypeInstance: func() interface{} {
				return &anthropic.AnthropicFileListRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if listReq, ok := req.(*anthropic.AnthropicFileListRequest); ok {
					return &FileRequest{
						Type: schemas.FileListRequest,
						ListRequest: &schemas.BifrostFileListRequest{
							Limit:    listReq.Limit,
							After:    listReq.After,
							Order:    listReq.Order,
							Provider: schemas.Anthropic,
						},
					}, nil
				}
				return nil, errors.New("invalid file list request type")
			},
			FileListResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileListResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
				return anthropic.ToAnthropicFileListResponse(resp), nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return anthropic.ToAnthropicChatCompletionError(err)
			},
		},
		{
			Provider: ProviderAnthropic,
			Path:     "/v1/files/{file_id}/content", // Following the reference implementation
			Method:   "GET",
			GetRequestTypeInstance: func() interface{} {
				return &anthropic.AnthropicFileRetrieveRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if retrieveReq, ok := req.(*anthropic.AnthropicFileRetrieveRequest); ok {
					return &FileRequest{
						Type: schemas.FileRetrieveRequest,
						RetrieveRequest: &schemas.BifrostFileRetrieveRequest{
							FileID:   retrieveReq.FileID,
							Provider: schemas.Anthropic,
						},
					}, nil
				}
				return nil, errors.New("invalid file retrieve request type")
			},
			FileRetrieveResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileRetrieveResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
				return anthropic.ToAnthropicFileRetrieveResponse(resp), nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return anthropic.ToAnthropicChatCompletionError(err)
			},
			PreCallback: in.extractFileIDPathParam,
		},
		{
			Provider: ProviderAnthropic,
			Path:     "/v1/files/{file_id}",
			Method:   "DELETE",
			GetRequestTypeInstance: func() interface{} {
				return &anthropic.AnthropicFileDeleteRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if deleteReq, ok := req.(*anthropic.AnthropicFileDeleteRequest); ok {
					return &FileRequest{
						Type: schemas.FileDeleteRequest,
						DeleteRequest: &schemas.BifrostFileDeleteRequest{
							FileID:   deleteReq.FileID,
							Provider: schemas.Anthropic,
						},
					}, nil
				}
				return nil, errors.New("invalid file delete request type")
			},
			FileDeleteResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileDeleteResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
				return anthropic.ToAnthropicFileDeleteResponse(resp), nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return anthropic.ToAnthropicChatCompletionError(err)
			},
			PreCallback: in.extractFileIDPathParam,
		},
	}
}

func (in *AnthropicRouter) extractFileIDPathParam(request *http.Request, _ *schemas.BifrostContext, req interface{}) error {
	fileID := request.PathValue("file_id")
	if len(fileID) == 0 {
		return errors.New("file_id is required")
	}

	switch r := req.(type) {
	case *anthropic.AnthropicFileRetrieveRequest:
		r.FileID = fileID
	case *anthropic.AnthropicFileDeleteRequest:
		r.FileID = fileID
	default:
		return errors.New("invalid request type for file ID extraction")
	}

	return nil
}

func (in *AnthropicRouter) parseAnthropicFileUploadMultipartRequest(req *http.Request, target interface{}) error {
	uploadReq, ok := target.(*anthropic.AnthropicFileUploadRequest)
	if !ok {
		return errors.New("invalid request type for file upload")
	}

	provider := req.Header.Get("x-model-provider")
	if provider == "" {
		provider = string(schemas.Anthropic)
	}

	// Parse multipart form
	if err := req.ParseMultipartForm(32 << 20); err != nil { // 32MB limit
		return err
	}

	// Extract purpose (required)
	purpose := req.FormValue("purpose")
	if purpose != "" {
		uploadReq.Purpose = purpose
	} else if schemas.ModelProvider(provider) == schemas.OpenAI && uploadReq.Purpose == "" {
		uploadReq.Purpose = "batch"
	}

	// Extract file (required)
	file, header, err := req.FormFile("file")
	if err != nil {
		return errors.New("file field is required")
	}
	defer file.Close()

	// Read file data
	fileData, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	uploadReq.File = fileData
	uploadReq.Filename = header.Filename

	return nil
}

func (in *AnthropicRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-anthropic-router"))
	in.routes = []RouteConfig{
		in.newCompleteRoute(),
		in.newMessagesRoute(),
	}
	in.routes = append(in.routes, in.newFileRouteConfigs()...)

	return in
}

func NewAnthropicRouter(client *bifrostcore.Bifrost) Router {
	return (&AnthropicRouter{
		GenericRouter: &GenericRouter{
			client: client,
		},
	}).init()
}
