package router

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/stretchr/testify/require"
)

func TestOpenAIResponsesStreamingErrors(t *testing.T) {
	t.Parallel()

	message := "upstream request failed"
	code := "invalid_request_error"
	bifrostErr := &schemas.BifrostError{Error: &schemas.ErrorField{Message: message, Code: &code}}
	router := &OpenAIRouter{GenericRouter: &GenericRouter{}}
	config := router.newResponsesRoute()
	ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())

	t.Run("initialization error", func(t *testing.T) {
		recorder := httptest.NewRecorder()
		router.sendStreamingInitError(recorder, ctx, config, bifrostErr)
		assertOpenAIResponsesStreamError(t, recorder.Body.String(), message, code)
	})
	t.Run("stream error", func(t *testing.T) {
		recorder := httptest.NewRecorder()
		stream := make(chan *schemas.BifrostStreamChunk, 1)
		stream <- &schemas.BifrostStreamChunk{BifrostError: bifrostErr}
		close(stream)
		router.handleStreaming(recorder, ctx, config, stream, func() {})
		assertOpenAIResponsesStreamError(t, recorder.Body.String(), message, code)
	})
}

func TestOpenAIResponsesRoutePreservesNativeRawBodyUpstream(t *testing.T) {
	require.NoError(t, log.Init("error"))

	upstreamBody := make(chan []byte, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		body, err := io.ReadAll(request.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		upstreamBody <- body
		var input struct {
			Stream bool `json:"stream"`
		}
		if err := json.Unmarshal(body, &input); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if input.Stream {
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = fmt.Fprint(w, "event: response.completed\ndata: {\"type\":\"response.completed\",\"sequence_number\":1,\"future_field\":{\"type\":\"namespace\",\"name\":\"ns\"}}\n\n")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{"id":"resp_1","object":"response","status":"completed","model":"gpt-5.6-luna","output":[],"future_field":{"type":"namespace","name":"ns"}}`)
	}))
	t.Cleanup(upstream.Close)

	model := "gpt-5.6-luna"
	apiKey := "test-key"
	handler, err := NewHandler(&mockConsoleClient{cfg: &pb.AiConfig{
		Enabled: true,
		Openai:  &pb.OpenAiConfig{Model: &model, ApiKey: &apiKey, BaseUrl: &upstream.URL},
	}})
	require.NoError(t, err)
	t.Cleanup(handler.Shutdown)

	for _, stream := range []bool{true, false} {
		t.Run(fmt.Sprintf("stream=%t", stream), func(t *testing.T) {
			body := fmt.Sprintf(`{"model":"openai/gpt-5.6-luna","stream":%t,"fallbacks":[],"input":[{"role":"developer","type":"additional_tools","tools":[{"type":"namespace","name":"ns","tools":[{"type":"custom","name":"grammar","format":{"type":"grammar","syntax":"lark","definition":"start: WORD"}},{"type":"function","name":"fn","parameters":{"type":"object"}}]}]}]}`, stream)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, string(RouteResponses), strings.NewReader(body)))
			require.Equal(t, http.StatusOK, response.Code)
			assertOpenAIResponsesNativeRequest(t, upstreamBody, response.Body.String(), stream)
		})
	}
}

func assertOpenAIResponsesNativeRequest(t *testing.T, upstreamBody <-chan []byte, body string, stream bool) {
	t.Helper()
	var rawBody map[string]any
	select {
	case upstream := <-upstreamBody:
		require.NoError(t, json.Unmarshal(upstream, &rawBody))
	case <-time.After(time.Second):
		t.Fatalf("upstream received no request; response body: %s", body)
	}
	require.Equal(t, "gpt-5.6-luna", rawBody["model"])
	require.NotContains(t, rawBody, "fallbacks")
	input := rawBody["input"].([]any)
	namespace := input[0].(map[string]any)["tools"].([]any)[0].(map[string]any)
	require.Equal(t, "namespace", namespace["type"])
	grammar := namespace["tools"].([]any)[0].(map[string]any)
	require.Equal(t, "custom", grammar["type"])
	require.Equal(t, "start: WORD", grammar["format"].(map[string]any)["definition"])
	var event map[string]any
	payload := []byte(body)
	if stream {
		payload = sseData(t, body)
	}
	require.NoError(t, json.Unmarshal(payload, &event))
	require.Equal(t, "namespace", event["future_field"].(map[string]any)["type"])
}

func TestOpenAIResponsesRawBodyEligibility(t *testing.T) {
	model := "gpt-5.6-luna"
	xaiModel := "grok-4.5"
	router := &OpenAIRouter{
		GenericRouter: &GenericRouter{},
		consoleClient: &mockConsoleClient{cfg: &pb.AiConfig{
			Enabled: true,
			Openai:  &pb.OpenAiConfig{Model: &model},
			Xai:     &pb.OpenAiConfig{Model: &xaiModel},
		}},
	}

	tests := []struct {
		name        string
		body        string
		viaChat     bool
		wantRawBody bool
		wantChat    bool
	}{
		{"native nonstream", `{"model":"openai/gpt-5.6-luna","input":"hi"}`, false, true, false},
		{"fallback", `{"model":"openai/gpt-5.6-luna","input":"hi","fallbacks":["anthropic/claude"]}`, false, false, false},
		{"chat fallback", `{"model":"openai/gpt-5.6-luna","input":"hi"}`, true, false, true},
		{"xai", `{"model":"xai/grok-4.5","input":"hi"}`, false, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := router.responsesRequestTypeInstance()
			httpRequest := httptest.NewRequest(http.MethodPost, string(RouteResponses), strings.NewReader(tt.body))
			require.NoError(t, router.responsesRequestParser(httpRequest, request))
			ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
			if tt.viaChat {
				ctx.SetValue(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback, true)
			}
			bifrostRequest, err := router.responsesRequestConverter(ctx, request)
			require.NoError(t, err)
			require.Equal(t, tt.wantRawBody, bifrostRequest.ResponsesRequest != nil && len(bifrostRequest.ResponsesRequest.RawRequestBody) > 0)
			require.Equal(t, tt.wantChat, bifrostRequest.ChatRequest != nil)
		})
	}
}

func assertOpenAIResponsesStreamError(t *testing.T, body, message, code string) {
	t.Helper()
	require.NotContains(t, body, "[DONE]")
	var response map[string]any
	require.NoError(t, json.Unmarshal(sseData(t, body), &response))
	require.Equal(t, "response.failed", response["type"])
	require.Contains(t, response, "sequence_number")
	failedResponse, ok := response["response"].(map[string]any)
	require.True(t, ok)
	errorDetail, ok := failedResponse["error"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, message, errorDetail["message"])
	require.Equal(t, code, errorDetail["code"])
}

func sseData(t *testing.T, body string) []byte {
	t.Helper()
	if strings.HasPrefix(body, "event: ") {
		body = body[strings.Index(body, "\ndata: ")+1:]
	}
	require.True(t, strings.HasPrefix(body, "data: "))
	return []byte(strings.TrimSuffix(strings.TrimPrefix(body, "data: "), "\n\n"))
}
