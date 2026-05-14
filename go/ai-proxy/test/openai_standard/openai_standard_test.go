package openai_standard

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/ollama/ollama/openai"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	apioai "github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/test/helpers"
)

func init() {
	_ = pflag.Set("provider", "openai")
	_ = pflag.Set("provider-host", "localhost:8081")
	_ = pflag.Set("provider-tokens", "test")
}

var (
	server         *httptest.Server
	providerServer *httptest.Server
	// TODO: for parallel runs concurrent map should be used
	handlers = make(map[string]http.HandlerFunc)
)

const (
	endpointChat      = "/openai/chat/completions"
	endpointResponses = "/openai/v1/responses"
)

func TestMain(m *testing.M) {
	var err error
	server, err = helpers.SetupServer()
	if err != nil {
		klog.Fatal(err)
	}

	providerServer, err = helpers.SetupProviderServer(handlers)
	if err != nil {
		klog.Fatal(err)
	}

	os.Exit(m.Run())
}

func TestOpenAIStandardProxy(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request should return correct openai response",
			Method:   "POST",
			Endpoint: endpointChat,
			Request: openai.ChatCompletionRequest{
				Model: "testmodel",
				Messages: []openai.Message{{
					Role:    "user",
					Content: "test prompt",
				}},
			},
			WantData: openai.ChatCompletion{
				Model: "testmodel",
				Choices: []openai.Choice{{
					Message: openai.Message{Role: "assistant", Content: "test response"},
				}},
			},
			WantErr:    nil,
			WantStatus: http.StatusOK,
		},
	}

	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			wantDataBytes, err := json.Marshal(tc.WantData)
			if err != nil {
				t.Fatal(err)
			}

			mockResponseFunc := helpers.MockResponse(tc.Endpoint, wantDataBytes, tc.WantErr, tc.WantStatus)
			err = mockResponseFunc(handlers)
			if err != nil {
				t.Fatal(err)
			}

			requestFunc := helpers.CreateRequest(tc.Method, tc.Endpoint, tc.Request)
			res, err := requestFunc(server, providerServer)
			if !errors.Is(err, tc.WantErr) {
				t.Fatalf("\nwant:\n%v\ngot:\n%v", tc.WantErr, err)
			}

			if !bytes.Equal(wantDataBytes, res) {
				t.Errorf("\nwant:\n%s\ngot:\n%s", tc.WantData, res)
			}
		})
	}
}

func TestOpenAIStandardProxy_Streaming(t *testing.T) {
	wantSSE := "data: test streaming response\n\n"

	streamTest := helpers.TestStruct[openai.ChatCompletionRequest, any]{
		Name:     "chat request with streaming should return SSE headers",
		Method:   "POST",
		Endpoint: endpointChat,
		Request: openai.ChatCompletionRequest{
			Model:  "testmodel",
			Stream: true,
			Messages: []openai.Message{
				{Role: "user", Content: "test streaming prompt"},
			},
		},
		WantStatus: http.StatusOK,
	}

	t.Run(streamTest.Name, func(t *testing.T) {
		mockResponse := func(h map[string]http.HandlerFunc) error {
			h[streamTest.Endpoint] = func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte(wantSSE))
			}
			return nil
		}

		if err := mockResponse(handlers); err != nil {
			t.Fatal(err)
		}

		requestFunc := helpers.CreateRequestWithResponse(streamTest.Method, streamTest.Endpoint, streamTest.Request)
		resBody, resp, err := requestFunc(server, providerServer)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if resp.StatusCode != streamTest.WantStatus {
			t.Fatalf("want status: %d, got: %d", streamTest.WantStatus, resp.StatusCode)
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType != "text/event-stream; charset=utf-8" {
			t.Errorf("expected Content-Type = text/event-stream; charset=utf-8, got: %s", contentType)
		}

		if string(resBody) != wantSSE {
			t.Errorf("expected SSE body %q, got %q", wantSSE, string(resBody))
		}
	})
}

func TestOpenAIEmbeddingsProxy(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request should return correct openai response",
			Method:   "POST",
			Endpoint: "/openai/v1/embeddings",
			Request: openai.EmbedRequest{
				Model: "openai-embedding-model",
				Input: "Hello from embeddings test.",
			},
			WantData: openai.EmbeddingList{
				Model: "openai-embedding-model",
				Data: []openai.Embedding{
					{
						Embedding: make([]float32, 5)},
				},
			},
			WantErr:    nil,
			WantStatus: http.StatusOK,
		},
	}

	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			wantDataBytes, err := json.Marshal(tc.WantData)
			if err != nil {
				t.Fatal(err)
			}

			mockResponseFunc := helpers.MockResponse(tc.Endpoint, wantDataBytes, tc.WantErr, tc.WantStatus)
			err = mockResponseFunc(handlers)
			if err != nil {
				t.Fatal(err)
			}

			requestFunc := helpers.CreateRequest(tc.Method, tc.Endpoint, tc.Request)
			res, err := requestFunc(server, providerServer)
			if !errors.Is(err, tc.WantErr) {
				t.Fatalf("\nwant:\n%v\ngot:\n%v", tc.WantErr, err)
			}

			if !bytes.Equal(wantDataBytes, res) {
				t.Errorf("\nwant:\n%s\ngot:\n%s", tc.WantData, res)
			}
		})
	}
}

func TestOpenAIResponsesProxy(t *testing.T) {
	requestBody := map[string]any{
		"model": "testmodel",
		"input": "test prompt",
		"response_format": map[string]any{
			"type": "json_object",
		},
	}

	wantResponse := map[string]any{
		"id":     "resp_123",
		"object": "response",
		"model":  "testmodel",
	}

	wantDataBytes, err := json.Marshal(wantResponse)
	if err != nil {
		t.Fatal(err)
	}

	if err := helpers.MockResponse(endpointResponses, wantDataBytes, nil, http.StatusOK)(handlers); err != nil {
		t.Fatal(err)
	}

	requestFunc := helpers.CreateRequestWithResponse(http.MethodPost, endpointResponses, requestBody)
	resBody, resp, err := requestFunc(server, providerServer)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want status: %d, got: %d", http.StatusOK, resp.StatusCode)
	}

	if !bytes.Equal(wantDataBytes, resBody) {
		t.Errorf("\nwant:\n%s\ngot:\n%s", wantDataBytes, resBody)
	}
}

func TestOpenAIAudioTranscriptionsProxy(t *testing.T) {
	wantBody := []byte(`{"text":"hello world"}`)
	if err := helpers.MockResponse("/v1/audio/transcriptions", wantBody, nil, http.StatusOK)(handlers); err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "clip.webm")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write([]byte("fake-audio")); err != nil {
		t.Fatal(err)
	}
	if err := mw.WriteField("model", "whisper-1"); err != nil {
		t.Fatal(err)
	}
	if err := mw.Close(); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(http.MethodPost, server.URL+apioai.EndpointAudioTranscriptions, &buf)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want status %d, got %d", http.StatusOK, resp.StatusCode)
	}
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, wantBody) {
		t.Fatalf("body: want %q got %q", wantBody, got)
	}
}

func TestOpenAIAudioTranslationsProxy(t *testing.T) {
	wantBody := []byte(`{"text":"hola"}`)
	if err := helpers.MockResponse("/v1/audio/translations", wantBody, nil, http.StatusOK)(handlers); err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "clip.webm")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write([]byte("fake-audio")); err != nil {
		t.Fatal(err)
	}
	if err := mw.WriteField("model", "whisper-1"); err != nil {
		t.Fatal(err)
	}
	if err := mw.Close(); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(http.MethodPost, server.URL+apioai.EndpointAudioTranslations, &buf)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want status %d, got %d", http.StatusOK, resp.StatusCode)
	}
	got, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, wantBody) {
		t.Fatalf("body: want %q got %q", wantBody, got)
	}
}
