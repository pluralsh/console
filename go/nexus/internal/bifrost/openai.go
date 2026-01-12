package bifrost

import (
	"errors"
	"io"
	"net/http"

	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

type OpenAIRouter struct {
	*GenericRouter
}

func (in *OpenAIRouter) newCompletionsRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderOpenAI,
		Path:                   "/v1/completions",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &openai.OpenAITextCompletionRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if openaiReq, ok := req.(*openai.OpenAITextCompletionRequest); ok {
				return &schemas.BifrostRequest{
					TextCompletionRequest: openaiReq.ToBifrostTextCompletionRequest(),
				}, nil
			}
			return nil, errors.New("invalid request type")
		},
		TextResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostTextCompletionResponse) (interface{}, error) {
			if resp.ExtraFields.Provider == schemas.OpenAI {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
			}
			return resp, nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return err
		},
		StreamConfig: &StreamConfig{
			TextStreamResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostTextCompletionResponse) (string, interface{}, error) {
				if resp.ExtraFields.Provider == schemas.OpenAI {
					if resp.ExtraFields.RawResponse != nil {
						return "", resp.ExtraFields.RawResponse, nil
					}
				}
				return "", resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
		},
	}
}

func (in *OpenAIRouter) newResponsesRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderOpenAI,
		Path:                   "/v1/responses",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &openai.OpenAIResponsesRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if openaiReq, ok := req.(*openai.OpenAIResponsesRequest); ok {
				return &schemas.BifrostRequest{
					ResponsesRequest: openaiReq.ToBifrostResponsesRequest(),
				}, nil

			}
			return nil, errors.New("invalid request type")
		},
		ResponsesResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
			if resp.ExtraFields.Provider == schemas.OpenAI {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
			}
			return resp, nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return err
		},
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
				if resp.ExtraFields.Provider == schemas.OpenAI {
					if resp.ExtraFields.RawResponse != nil {
						return string(resp.Type), resp.ExtraFields.RawResponse, nil
					}
				}
				return string(resp.Type), resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
		},
	}
}

func (in *OpenAIRouter) newChatCompletionsRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderOpenAI,
		Path:                   "/v1/chat/completions",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &openai.OpenAIChatRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if openaiReq, ok := req.(*openai.OpenAIChatRequest); ok {
				return &schemas.BifrostRequest{
					ChatRequest: openaiReq.ToBifrostChatRequest(),
				}, nil
			}
			return nil, errors.New("invalid request type")
		},
		ChatResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (interface{}, error) {
			if resp.ExtraFields.Provider == schemas.OpenAI {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
			}
			return resp, nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return err
		},
		StreamConfig: &StreamConfig{
			ChatStreamResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (string, interface{}, error) {
				if resp.ExtraFields.Provider == schemas.OpenAI {
					if resp.ExtraFields.RawResponse != nil {
						return "", resp.ExtraFields.RawResponse, nil
					}
				}
				return "", resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
		},
	}
}

func parseOpenAIFileUploadMultipartRequest(req *http.Request, target interface{}) error {
	uploadReq, ok := target.(*schemas.BifrostFileUploadRequest)
	if !ok {
		return errors.New("invalid request type for file upload")
	}

	// Parse multipart form
	if err := req.ParseMultipartForm(32 << 20); err != nil { // 32MB limit
		return err
	}

	// Extract purpose (required)
	purpose := req.FormValue("purpose")
	if purpose == "" {
		return errors.New("purpose field is required")
	}
	uploadReq.Purpose = schemas.FilePurpose(purpose)

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

	// Extract provider
	provider := req.FormValue("provider")
	if provider != "" {
		uploadReq.Provider = schemas.ModelProvider(provider)
	}

	return nil
}

// newFileRouteConfigs creates route configurations for OpenAI Files API endpoints.
func (in *OpenAIRouter) newFileRouteConfigs() []RouteConfig {
	return []RouteConfig{
		{
			Provider: ProviderOpenAI,
			Path:     "/v1/files",
			Method:   "POST",
			GetRequestTypeInstance: func() interface{} {
				return &schemas.BifrostFileUploadRequest{}
			},
			RequestParser: parseOpenAIFileUploadMultipartRequest,
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if uploadReq, ok := req.(*schemas.BifrostFileUploadRequest); ok {
					return &FileRequest{
						Type:          schemas.FileUploadRequest,
						UploadRequest: uploadReq,
					}, nil
				}
				return nil, errors.New("invalid file upload request type")
			},
			FileUploadResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileUploadResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil && resp.ExtraFields.Provider == schemas.OpenAI {
					return resp.ExtraFields.RawResponse, nil
				}
				return resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
			PreCallback: in.ensureProviderSet,
		},
		{
			Provider: ProviderOpenAI,
			Path:     "/v1/files",
			Method:   "GET",
			GetRequestTypeInstance: func() interface{} {
				return &schemas.BifrostFileListRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if listReq, ok := req.(*schemas.BifrostFileListRequest); ok {
					return &FileRequest{
						Type:        schemas.FileListRequest,
						ListRequest: listReq,
					}, nil
				}
				return nil, errors.New("invalid file list request type")
			},
			FileListResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileListResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil && resp.ExtraFields.Provider == schemas.OpenAI {
					return resp.ExtraFields.RawResponse, nil
				}
				return resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
			PreCallback: in.ensureProviderSet,
		},
		{
			Provider: ProviderOpenAI,
			Path:     "/v1/files/{file_id}",
			Method:   "GET",
			GetRequestTypeInstance: func() interface{} {
				return &schemas.BifrostFileRetrieveRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if retrieveReq, ok := req.(*schemas.BifrostFileRetrieveRequest); ok {
					return &FileRequest{
						Type:            schemas.FileRetrieveRequest,
						RetrieveRequest: retrieveReq,
					}, nil
				}
				return nil, errors.New("invalid file content request type")
			},
			FileRetrieveResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileRetrieveResponse) (interface{}, error) {
				return resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
			PreCallback: in.preCallback(in.ensureProviderSet, in.extractFileIDPathParam),
		},
		{
			Provider: ProviderOpenAI,
			Path:     "/v1/files/{file_id}",
			Method:   "DELETE",
			GetRequestTypeInstance: func() interface{} {
				return &schemas.BifrostFileDeleteRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if deleteReq, ok := req.(*schemas.BifrostFileDeleteRequest); ok {
					return &FileRequest{
						Type:          schemas.FileDeleteRequest,
						DeleteRequest: deleteReq,
					}, nil
				}
				return nil, errors.New("invalid file delete request type")
			},
			FileDeleteResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileDeleteResponse) (interface{}, error) {
				if resp.ExtraFields.RawResponse != nil && resp.ExtraFields.Provider == schemas.OpenAI {
					return resp.ExtraFields.RawResponse, nil
				}
				return resp, nil
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
			PreCallback: in.preCallback(in.ensureProviderSet, in.extractFileIDPathParam),
		},
		{
			Provider: ProviderOpenAI,
			Path:     "/v1/files/{file_id}/content",
			Method:   "GET",
			GetRequestTypeInstance: func() interface{} {
				return &schemas.BifrostFileContentRequest{}
			},
			FileRequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error) {
				if contentReq, ok := req.(*schemas.BifrostFileContentRequest); ok {
					return &FileRequest{
						Type:           schemas.FileContentRequest,
						ContentRequest: contentReq,
					}, nil
				}
				return nil, errors.New("invalid file content request type")
			},
			ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
				return err
			},
			PreCallback: in.preCallback(in.ensureProviderSet, in.extractFileIDPathParam),
		},
	}
}

func (in *OpenAIRouter) newEmbeddingsRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderOpenAI,
		Path:                   "/v1/embeddings",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &openai.OpenAIEmbeddingRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			if embeddingReq, ok := req.(*openai.OpenAIEmbeddingRequest); ok {
				return &schemas.BifrostRequest{
					EmbeddingRequest: embeddingReq.ToBifrostEmbeddingRequest(),
				}, nil
			}
			return nil, errors.New("invalid request type")
		},
		EmbeddingResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostEmbeddingResponse) (interface{}, error) {
			if resp.ExtraFields.Provider == schemas.OpenAI {
				if resp.ExtraFields.RawResponse != nil {
					return resp.ExtraFields.RawResponse, nil
				}
			}
			return resp, nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return err
		},
	}
}

func (in *OpenAIRouter) extractFileIDPathParam(request *http.Request, _ *schemas.BifrostContext, req interface{}) error {
	fileID := request.PathValue("file_id")
	if len(fileID) == 0 {
		return errors.New("file_id is required")
	}

	switch r := req.(type) {
	case *schemas.BifrostFileRetrieveRequest:
		r.FileID = fileID
	case *schemas.BifrostFileDeleteRequest:
		r.FileID = fileID
	case *schemas.BifrostFileContentRequest:
		r.FileID = fileID
	default:
		return errors.New("invalid request type for file ID extraction")
	}

	return nil
}

func (in *OpenAIRouter) ensureProviderSet(_ *http.Request, _ *schemas.BifrostContext, req interface{}) error {
	switch r := req.(type) {
	case *schemas.BifrostFileUploadRequest:
		if len(r.Provider) == 0 {
			r.Provider = schemas.OpenAI
		}
	case *schemas.BifrostFileListRequest:
		if len(r.Provider) == 0 {
			r.Provider = schemas.OpenAI
		}
	case *schemas.BifrostFileDeleteRequest:
		if len(r.Provider) == 0 {
			r.Provider = schemas.OpenAI
		}
	case *schemas.BifrostFileRetrieveRequest:
		if len(r.Provider) == 0 {
			r.Provider = schemas.OpenAI
		}
	case *schemas.BifrostFileContentRequest:
		if len(r.Provider) == 0 {
			r.Provider = schemas.OpenAI
		}
	}

	return nil
}

func (in *OpenAIRouter) preCallback(callback ...PreRequestCallback) PreRequestCallback {
	return func(request *http.Request, bifrostCtx *schemas.BifrostContext, req interface{}) error {
		for _, cb := range callback {
			if err := cb(request, bifrostCtx, req); err != nil {
				return err
			}
		}
		return nil
	}
}

func (in *OpenAIRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-openai-router"))
	in.routes = []RouteConfig{
		in.newChatCompletionsRoute(),
		in.newCompletionsRoute(),
		in.newResponsesRoute(),
		in.newEmbeddingsRoute(),
	}
	in.routes = append(in.routes, in.newFileRouteConfigs()...)

	return in
}

func NewOpenAIRouter(client *bifrostcore.Bifrost) Router {
	return (&OpenAIRouter{
		GenericRouter: &GenericRouter{
			client: client,
		},
	}).init()
}
