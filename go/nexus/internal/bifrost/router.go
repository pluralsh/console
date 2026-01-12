package bifrost

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/bytedance/sonic"
	"github.com/go-chi/chi/v5"
	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/schemas"
	"go.uber.org/zap"
)

// Router defines the interface that all provider routers must implement
// to register their routes with the main HTTP router.
type Router interface {
	RegisterRoutes(chi.Router)
}

// StreamingRequest interface for requests that support streaming
type StreamingRequest interface {
	IsStreamingRequested() bool
}

type TextStreamResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostTextCompletionResponse) (string, interface{}, error)

type ChatStreamResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (string, interface{}, error)

type ResponsesStreamResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error)

type StreamErrorConverter func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{}

type StreamConfig struct {
	// TextStreamResponseConverter is the function to convert BifrostTextCompletionResponse to streaming format
	TextStreamResponseConverter TextStreamResponseConverter

	// ChatStreamResponseConverter is the function to convert BifrostChatResponse to streaming format
	ChatStreamResponseConverter ChatStreamResponseConverter

	// ResponsesStreamResponseConverter is the function to convert BifrostResponsesResponse to streaming format
	ResponsesStreamResponseConverter ResponsesStreamResponseConverter

	// ErrorConverter is the function to convert BifrostError to streaming format
	ErrorConverter StreamErrorConverter
}

type RequestConverter func(ctx *schemas.BifrostContext, req any) (*schemas.BifrostRequest, error)
type TextResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostTextCompletionResponse) (interface{}, error)
type ChatResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (interface{}, error)
type ResponsesResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error)
type EmbeddingResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostEmbeddingResponse) (interface{}, error)
type ErrorConverter func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{}

type FileRequestConverter func(ctx *schemas.BifrostContext, req interface{}) (*FileRequest, error)
type FileUploadResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileUploadResponse) (interface{}, error)
type FileListResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileListResponse) (interface{}, error)
type FileRetrieveResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileRetrieveResponse) (interface{}, error)
type FileDeleteResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileDeleteResponse) (interface{}, error)
type FileContentResponseConverter func(ctx *schemas.BifrostContext, resp *schemas.BifrostFileContentResponse) (interface{}, error)

// FileRequest wraps a Bifrost file request with its type information.
type FileRequest struct {
	Type            schemas.RequestType
	UploadRequest   *schemas.BifrostFileUploadRequest
	ListRequest     *schemas.BifrostFileListRequest
	RetrieveRequest *schemas.BifrostFileRetrieveRequest
	DeleteRequest   *schemas.BifrostFileDeleteRequest
	ContentRequest  *schemas.BifrostFileContentRequest
}

type PreRequestCallback func(request *http.Request, bifrostCtx *schemas.BifrostContext, req interface{}) error

type Provider string

const (
	ProviderOpenAI    Provider = "openai"
	ProviderAnthropic Provider = "anthropic"
)

type RouteConfig struct {
	// Provider is the AI provider type for the route
	Provider Provider

	// Path is the HTTP endpoint path for the route
	Path string

	// Method is the HTTP method for the route (e.g., GET, POST)
	Method string

	// GetRequestTypeInstance is a function to get a new instance of the request type
	GetRequestTypeInstance func() interface{}

	// RequestConverter converts incoming requests to BifrostRequest
	RequestConverter RequestConverter

	// RequestParser is a function to parse the raw request body.
	RequestParser func(req *http.Request, target interface{}) error

	// FileRequestConverter converts incoming requests to FileRequest
	FileRequestConverter FileRequestConverter

	// TextResponseConverter converts BifrostTextCompletionResponse to integration format
	TextResponseConverter TextResponseConverter

	// ChatResponseConverter converts BifrostChatResponse to integration format
	ChatResponseConverter ChatResponseConverter

	// ResponsesResponseConverter converts BifrostResponsesResponse to integration format
	ResponsesResponseConverter ResponsesResponseConverter

	// EmbeddingResponseConverter converts BifrostEmbeddingResponse to integration format
	EmbeddingResponseConverter EmbeddingResponseConverter

	// FileUploadResponseConverter converts BifrostFileUploadResponse to integration format
	FileUploadResponseConverter FileUploadResponseConverter

	// FileListResponseConverter converts BifrostFileListResponse to integration format
	FileListResponseConverter FileListResponseConverter

	// FileRetrieveResponseConverter converts BifrostFileRetrieveResponse to integration format
	FileRetrieveResponseConverter FileRetrieveResponseConverter

	// FileDeleteResponseConverter converts BifrostFileDeleteResponse to integration format
	FileDeleteResponseConverter FileDeleteResponseConverter

	// FileContentResponseConverter converts BifrostFileContentResponse to integration format
	FileContentResponseConverter FileContentResponseConverter

	// ErrorConverter converts BifrostError to integration format
	ErrorConverter ErrorConverter

	// StreamConfig holds the streaming configuration for the route
	StreamConfig *StreamConfig

	// PreCallback is called after parsing but before Bifrost processing
	PreCallback PreRequestCallback
}

// GenericRouter provides common functionality for different AI provider routers.
type GenericRouter struct {
	// Logger for the router
	logger *zap.Logger

	// Bifrost client for handling requests
	client *bifrostcore.Bifrost

	// List of route configurations
	routes []RouteConfig
}

func (in *GenericRouter) RegisterRoutes(r chi.Router) {
	for _, route := range in.routes {
		if route.GetRequestTypeInstance == nil {
			in.logger.Warn("route configuration is invalid: GetRequestTypeInstance is nil",
				zap.String("path", route.Path),
				zap.String("method", route.Method),
			)
			continue
		}

		if testInstance := route.GetRequestTypeInstance(); testInstance == nil {
			in.logger.Warn("route configuration is invalid: GetRequestTypeInstance returned nil",
				zap.String("path", route.Path),
				zap.String("method", route.Method),
			)
			continue
		}

		if route.ErrorConverter == nil {
			in.logger.Warn("route configuration is invalid: ErrorConverter is nil",
				zap.String("path", route.Path),
				zap.String("method", route.Method),
			)
			continue
		}

		handler := in.createHandler(route)
		path := fmt.Sprintf("/%s/%s", route.Provider, strings.TrimPrefix(route.Path, "/"))
		switch route.Method {
		case http.MethodGet:
			r.Get(path, handler)
		case http.MethodPost:
			r.Post(path, handler)
		case http.MethodDelete:
			r.Delete(path, handler)
		default:
			in.logger.Warn("unsupported HTTP method in route configuration",
				zap.String("path", route.Path),
				zap.String("method", route.Method),
			)
			return
		}
		in.logger.Info("registered route", zap.String("method", route.Method), zap.String("path", path))
	}
}

func (in *GenericRouter) createHandler(config RouteConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req := config.GetRequestTypeInstance()
		bifrostCtx, cancel := schemas.NewBifrostContextWithCancel(r.Context())

		if config.RequestParser != nil {
			if err := config.RequestParser(r, req); err != nil {
				in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(err, "Failed to parse request"))
				return
			}
		} else {
			rawBody, err := io.ReadAll(r.Body)
			if err != nil {
				in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(err, "Failed to read request body"))
				return
			}

			if len(rawBody) > 0 {
				if err = sonic.Unmarshal(rawBody, req); err != nil {
					in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(err, "Invalid JSON"))
					return
				}
			}
		}

		var bifrostReq *schemas.BifrostRequest
		var fileReq *FileRequest
		var err error

		if config.PreCallback != nil {
			if err = config.PreCallback(r, bifrostCtx, req); err != nil {
				in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(err, "pre-request callback failed"))
				return
			}
		}

		if config.FileRequestConverter != nil {
			fileReq, err = config.FileRequestConverter(bifrostCtx, req)
		} else {
			bifrostReq, err = config.RequestConverter(bifrostCtx, req)
		}

		if err != nil {
			in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(err, "failed to convert request"))
			return
		}
		if bifrostReq == nil && fileReq == nil {
			in.sendError(w, bifrostCtx, config.ErrorConverter, in.toBifrostError(nil, "converted request is nil"))
			return
		}

		if fileReq != nil {
			defer cancel()
			in.handleFileRequest(w, config, r, fileReq, bifrostCtx)
			return
		}

		isStreaming := false
		if streamingReq, ok := req.(StreamingRequest); ok {
			isStreaming = streamingReq.IsStreamingRequested()
		}
		if isStreaming {
			in.handleStreamingRequest(w, config, bifrostReq, bifrostCtx, cancel)
		} else {
			defer cancel()
			in.handleNonStreamingRequest(w, config, r, bifrostReq, bifrostCtx)
		}
	}
}

func (in *GenericRouter) handleFileRequest(w http.ResponseWriter, config RouteConfig, req *http.Request, fileReq *FileRequest, ctx *schemas.BifrostContext) {
	var response any
	var err error

	switch fileReq.Type {
	case schemas.FileUploadRequest:
		if fileReq.UploadRequest == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "Invalid upload request"))
			return
		}
		uploadResponse, bifrostErr := in.client.FileUploadRequest(ctx, fileReq.UploadRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}
		if uploadResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "upload response is nil"))
			return
		}

		response, err = config.FileUploadResponseConverter(ctx, uploadResponse)

	case schemas.FileListRequest:
		if fileReq.ListRequest == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "Invalid list request"))
			return
		}
		listResponse, bifrostErr := in.client.FileListRequest(ctx, fileReq.ListRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}
		if listResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "list response is nil"))
			return
		}

		response, err = config.FileListResponseConverter(ctx, listResponse)

	case schemas.FileRetrieveRequest:
		if fileReq.RetrieveRequest == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "Invalid retrieve request"))
			return
		}
		retrieveResponse, bifrostErr := in.client.FileRetrieveRequest(ctx, fileReq.RetrieveRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}
		if retrieveResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "retrieve response is nil"))
			return
		}

		response, err = config.FileRetrieveResponseConverter(ctx, retrieveResponse)

	case schemas.FileDeleteRequest:
		if fileReq.DeleteRequest == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "Invalid delete request"))
			return
		}
		deleteResponse, bifrostErr := in.client.FileDeleteRequest(ctx, fileReq.DeleteRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}
		if deleteResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "delete response is nil"))
			return
		}

		response, err = config.FileDeleteResponseConverter(ctx, deleteResponse)

	case schemas.FileContentRequest:
		if fileReq.ContentRequest == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "Invalid content request"))
			return
		}
		contentResponse, bifrostErr := in.client.FileContentRequest(ctx, fileReq.ContentRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}
		if contentResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "content response is nil"))
			return
		}

		// For file content, we might return binary data
		// Assuming FileContentResponseConverter handles it or we directly write to writer if it's nil?
		// In bifrost integration it says: "Note: This may return binary data or a wrapper object depending on the integration."
		if config.FileContentResponseConverter != nil {
			response, err = config.FileContentResponseConverter(ctx, contentResponse)
		} else {
			// Default binary handling if converter is not provided
			if contentResponse.Content != nil {
				_, err = w.Write(contentResponse.Content)
				if err != nil {
					in.logger.Error("failed to write file content", zap.Error(err))
				}
				return
			}
			response = nil // or some success
		}

	default:
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "unsupported request type"))
		return
	}

	if err != nil {
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(err, "failed to convert response"))
		return
	}

	if response != nil {
		in.sendSuccess(w, ctx, config.ErrorConverter, response)
	}
}

func (in *GenericRouter) handleStreamingRequest(w http.ResponseWriter, config RouteConfig, bifrostReq *schemas.BifrostRequest, ctx *schemas.BifrostContext, cancel context.CancelFunc) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var stream chan *schemas.BifrostStream
	var bifrostErr *schemas.BifrostError

	switch {
	case bifrostReq.TextCompletionRequest != nil:
		stream, bifrostErr = in.client.TextCompletionStreamRequest(ctx, bifrostReq.TextCompletionRequest)
	case bifrostReq.ChatRequest != nil:
		stream, bifrostErr = in.client.ChatCompletionStreamRequest(ctx, bifrostReq.ChatRequest)
	case bifrostReq.ResponsesRequest != nil:
		stream, bifrostErr = in.client.ResponsesStreamRequest(ctx, bifrostReq.ResponsesRequest)
	default:
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "unsupported request type for streaming"))
		cancel()
		return
	}

	if bifrostErr != nil {
		cancel()
		in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
		return
	}

	if config.StreamConfig == nil {
		cancel()
		// Drain the stream to avoid goroutine leaks
		go func() {
			for range stream {
			}
		}()

		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "streaming configuration is missing"))
		return
	}

	in.handleStreaming(w, ctx, config, stream, cancel)
}

func (in *GenericRouter) handleStreaming(w http.ResponseWriter, ctx *schemas.BifrostContext, config RouteConfig, stream chan *schemas.BifrostStream, cancel context.CancelFunc) {
	defer cancel()

	flusher, ok := w.(http.Flusher)
	if !ok {
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "streaming not supported"))
		return
	}

	for chunk := range stream {
		if chunk == nil {
			continue
		}

		var errorResponse any
		fallbackError := map[string]any{
			"error": map[string]any{
				"type":    "internal_error",
				"message": "An internal error occurred while processing your request.",
			},
		}

		if chunk.BifrostError != nil {
			switch {
			case config.StreamConfig != nil && config.StreamConfig.ErrorConverter != nil:
				errorResponse = config.StreamConfig.ErrorConverter(ctx, chunk.BifrostError)
			case config.ErrorConverter != nil:
				errorResponse = config.ErrorConverter(ctx, chunk.BifrostError)
			default:
				errorResponse = fallbackError
			}

			errorJSON, err := in.toStreamingErrorResponse(errorResponse)
			if err != nil {
				// Fallback to generic error if conversion fails
				var errorBytes []byte
				if errorBytes, err = sonic.Marshal(fallbackError); err != nil {
					cancel()
					return
				}

				errorJSON = string(errorBytes)
			}

			if _, err := fmt.Fprint(w, errorJSON); err != nil {
				cancel()
				return
			}

			flusher.Flush()
			return
		}

		var eventType string
		var convertedResponse any
		var err error

		switch {
		case chunk.BifrostTextCompletionResponse != nil:
			eventType, convertedResponse, err = config.StreamConfig.TextStreamResponseConverter(ctx, chunk.BifrostTextCompletionResponse)
		case chunk.BifrostChatResponse != nil:
			eventType, convertedResponse, err = config.StreamConfig.ChatStreamResponseConverter(ctx, chunk.BifrostChatResponse)
		case chunk.BifrostResponsesStreamResponse != nil:
			eventType, convertedResponse, err = config.StreamConfig.ResponsesStreamResponseConverter(ctx, chunk.BifrostResponsesStreamResponse)
		default:
			requestType := in.safeGetRequestType(chunk)
			convertedResponse, err = nil, fmt.Errorf("no response converter found for request type: %s", requestType)
		}

		if convertedResponse == nil && err == nil {
			// Skip if there's nothing to send
			continue
		}

		if err != nil {
			in.logger.Error("failed to convert stream response", zap.Error(err))
			continue
		}

		if eventType != "" {
			// OPENAI RESPONSES FORMAT: Use event: and data: lines for OpenAI responses API compatibility
			if _, err := fmt.Fprintf(w, "event: %s\n", eventType); err != nil {
				cancel()
				return
			}
		}

		switch sse := convertedResponse.(type) {
		case string:
			// CUSTOM SSE FORMAT: The converter returned a complete SSE string
			// This is used by providers like Anthropic that need custom event types
			// Example: "event: content_block_delta\ndata: {...}\n\n"
			if !strings.HasPrefix(sse, "data: ") && !strings.HasPrefix(sse, "event: ") {
				sse = fmt.Sprintf("data: %s\n\n", sse)
			}
			if _, err := fmt.Fprint(w, sse); err != nil {
				cancel() // Client disconnected (write error), cancel upstream stream
				return
			}
		default:
			// STANDARD SSE FORMAT: The converter returned an object
			// This will be JSON marshaled and wrapped as "data: {json}\n\n"
			// Used by most providers (OpenAI chat/completions, Google, etc.)
			responseJSON, err := sonic.Marshal(convertedResponse)
			if err != nil {
				in.logger.Error("failed to marshal stream response to JSON", zap.Error(err))
				continue
			}

			// Send as SSE data
			if _, err := fmt.Fprintf(w, "data: %s\n\n", responseJSON); err != nil {
				cancel() // Client disconnected (write error), cancel upstream stream
				return
			}
		}

		flusher.Flush()
	}

	// Only send the [DONE] marker for plain SSE APIs that expect it.
	// Do NOT send [DONE] for the following cases:
	//   - OpenAI "responses" API and Anthropic messages API: they signal completion by simply closing the stream, not sending [DONE].
	//   - Bedrock: uses AWS Event Stream format rather than SSE with [DONE].
	// Bifrost handles any additional cleanup internally on normal stream completion.
	if in.shouldSendDoneMarker(config.Provider, config.Path) {
		if _, err := fmt.Fprint(w, "data: [DONE]\n\n"); err != nil {
			in.logger.Error("failed to send done marker", zap.Error(err))
			cancel()
			return // End stream on error, Bifrost handles cleanup internally
		}
	}
}

func (in *GenericRouter) shouldSendDoneMarker(provider Provider, path string) bool {
	if provider == ProviderAnthropic {
		return false
	}

	if strings.Contains(path, "/responses") {
		return false
	}

	return true
}

func (in *GenericRouter) toStreamingErrorResponse(errorResponse any) (string, error) {
	// Check if the error response is already a string (custom SSE format)
	// This is used by providers like Anthropic that need custom event types
	// Example: "event: error\ndata: {...}\n\n"
	if sseErrorString, isCustomSSEFormat := errorResponse.(string); isCustomSSEFormat {
		return sseErrorString, nil
	}

	// STANDARD SSE FORMAT: The converter returned an object
	// This will be JSON marshaled and wrapped as "data: {json}\n\n"
	// Used by most providers (OpenAI, Google, etc.)
	errorJSON, err := sonic.Marshal(errorResponse)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("data: %s\n\n", string(errorJSON)), nil
}

// safeGetRequestType safely obtains the request type from a BifrostStream chunk.
// It checks multiple sources in order of preference:
// 1. Response ExtraFields if any response is available
// 2. BifrostError ExtraFields if error is available and not nil
// 3. Falls back to "unknown" if no source is available
func (in *GenericRouter) safeGetRequestType(chunk *schemas.BifrostStream) string {
	if chunk == nil {
		return "unknown"
	}

	// Try to get RequestType from response ExtraFields (preferred source)
	switch {
	case chunk.BifrostTextCompletionResponse != nil:
		return string(chunk.BifrostTextCompletionResponse.ExtraFields.RequestType)
	case chunk.BifrostChatResponse != nil:
		return string(chunk.BifrostChatResponse.ExtraFields.RequestType)
	case chunk.BifrostResponsesStreamResponse != nil:
		return string(chunk.BifrostResponsesStreamResponse.ExtraFields.RequestType)
	case chunk.BifrostSpeechStreamResponse != nil:
		return string(chunk.BifrostSpeechStreamResponse.ExtraFields.RequestType)
	case chunk.BifrostTranscriptionStreamResponse != nil:
		return string(chunk.BifrostTranscriptionStreamResponse.ExtraFields.RequestType)
	}

	// Try to get RequestType from error ExtraFields (fallback)
	if chunk.BifrostError != nil && chunk.BifrostError.ExtraFields.RequestType != "" {
		return string(chunk.BifrostError.ExtraFields.RequestType)
	}

	// Final fallback
	return "unknown"
}

func (in *GenericRouter) handleNonStreamingRequest(w http.ResponseWriter, config RouteConfig, req *http.Request, bifrostReq *schemas.BifrostRequest, ctx *schemas.BifrostContext) {
	var response any
	var err error

	switch {
	case bifrostReq.TextCompletionRequest != nil:
		bifrostResponse, bifrostErr := in.client.TextCompletionRequest(ctx, bifrostReq.TextCompletionRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}

		if bifrostResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "text completion response is nil"))
			return
		}

		response, err = config.TextResponseConverter(ctx, bifrostResponse)
	case bifrostReq.ChatRequest != nil:
		bifrostResponse, bifrostErr := in.client.ChatCompletionRequest(ctx, bifrostReq.ChatRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}

		if bifrostResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "chat response is nil"))
			return
		}

		response, err = config.ChatResponseConverter(ctx, bifrostResponse)
	case bifrostReq.ResponsesRequest != nil:
		bifrostResponse, bifrostErr := in.client.ResponsesRequest(ctx, bifrostReq.ResponsesRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}

		if bifrostResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "responses response is nil"))
			return
		}

		response, err = config.ResponsesResponseConverter(ctx, bifrostResponse)
	case bifrostReq.EmbeddingRequest != nil:
		bifrostResponse, bifrostErr := in.client.EmbeddingRequest(ctx, bifrostReq.EmbeddingRequest)
		if bifrostErr != nil {
			in.sendError(w, ctx, config.ErrorConverter, bifrostErr)
			return
		}

		if bifrostResponse == nil {
			in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "embedding response is nil"))
			return
		}

		response, err = config.EmbeddingResponseConverter(ctx, bifrostResponse)
	default:
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(nil, "unsupported request type"))
		return
	}

	if err != nil {
		in.sendError(w, ctx, config.ErrorConverter, in.toBifrostError(err, "failed to convert text completion response"))
		return
	}

	in.sendSuccess(w, ctx, config.ErrorConverter, response)
}

func (in *GenericRouter) sendError(w http.ResponseWriter, bifrostCtx *schemas.BifrostContext, errorConverter ErrorConverter, bifrostErr *schemas.BifrostError) {
	if bifrostErr.StatusCode != nil {
		w.WriteHeader(*bifrostErr.StatusCode)
	} else {
		w.WriteHeader(http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")

	responseObj := errorConverter(bifrostCtx, bifrostErr)
	if err := json.NewEncoder(w).Encode(responseObj); err != nil {
		in.logger.Error("failed to encode error response", zap.Error(err))
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(fmt.Sprintf("failed to encode error response: %v", err)))
	}
}

func (in *GenericRouter) sendSuccess(w http.ResponseWriter, bifrostCtx *schemas.BifrostContext, errorConverter ErrorConverter, response any) {
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(response); err != nil {
		in.sendError(w, bifrostCtx, errorConverter, in.toBifrostError(err, "failed to encode success response"))
	}
}

func (in *GenericRouter) toBifrostError(err error, message string) *schemas.BifrostError {
	if err == nil {
		return &schemas.BifrostError{
			IsBifrostError: false,
			Error: &schemas.ErrorField{
				Message: message,
			},
		}
	}

	return &schemas.BifrostError{
		IsBifrostError: false,
		Error: &schemas.ErrorField{
			Message: fmt.Errorf("%s: %w", message, err).Error(),
		},
	}
}
