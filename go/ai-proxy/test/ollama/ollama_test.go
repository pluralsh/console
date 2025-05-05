package ollama_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	ollamaapi "github.com/ollama/ollama/api"
	"github.com/ollama/ollama/openai"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/test/helpers"
)

func init() {
	_ = pflag.Set("provider", "ollama")
	_ = pflag.Set("provider-host", "localhost:8081")
	_ = pflag.Set("provider-token", "test")
}

var (
	server         *httptest.Server
	providerServer *httptest.Server
	// TODO: for parallel runs concurrent map should be used
	handlers = make(map[string]http.HandlerFunc)
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
func TestOllamaEmbeddings(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "embeddings request should return correct response",
			Method:   "POST",
			Endpoint: "/openai/v1/embeddings",
			Request: openai.EmbedRequest{
				Model: "testmodel",
				Input: []string{"test input"},
			},
			WantData: openai.EmbeddingList{
				Object: "list",
				Data: []openai.Embedding{
					{
						Object:    "embedding",
						Embedding: []float32{0.1, 0.2, 0.3},
						Index:     0,
					},
				},
				Model: "testmodel",
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
			gotBytes, err := requestFunc(server, providerServer)

			if tc.WantErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tc.WantErr)
				}
				return
			}

			if err != nil {
				t.Fatal(err)
			}

			var got openai.EmbeddingList
			err = json.Unmarshal(gotBytes, &got)
			if err != nil {
				t.Fatal(err)
			}

			if !bytes.Equal(gotBytes, wantDataBytes) {
				t.Errorf("got %s, want %s", gotBytes, wantDataBytes)
			}
		})
	}
}

func TestOllamaToolCalling(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request with tool calls should return correct openai response",
			Method:   "POST",
			Endpoint: "/openai/v1/chat/completions",
			Request: openai.ChatCompletionRequest{
				Model: "testmodel",
				Messages: []openai.Message{{
					Role:    "user",
					Content: "test prompt with tool call",
				}},
				Stream: false,
			},
			WantData: openai.ChatCompletion{
				Model: "testmodel",
				Choices: []openai.Choice{{
					Message: openai.Message{
						Role:    "assistant",
						Content: "test response",
						ToolCalls: []openai.ToolCall{{
							Function: struct {
								Name      string `json:"name"`
								Arguments string `json:"arguments"`
							}{
								Name:      "test_function",
								Arguments: `{"arg1": "value1", "arg2": "value2"}`,
							},
						}},
					},
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
				t.Errorf("\nwant:\n%s\ngot:\n%s", wantDataBytes, res)
			}
		})
	}
}

func TestOllamaAIProxy(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request should return correct ollama response",
			Method:   "POST",
			Endpoint: "/api/chat",
			Request: ollamaapi.ChatRequest{
				Model: "testmodel",
				Messages: []ollamaapi.Message{{
					Role:    "user",
					Content: "test prompt",
				}},
			},
			WantData: ollamaapi.ChatResponse{
				Model: "testmodel",
				Message: ollamaapi.Message{
					Role:    "user",
					Content: "test response",
				},
			},
			WantErr:    nil,
			WantStatus: http.StatusOK,
		},
		{
			Name:     "chat request should return correct openai response",
			Method:   "POST",
			Endpoint: "/openai/v1/chat/completions",
			Request: openai.ChatCompletionRequest{
				Model: "testmodel",
				Messages: []openai.Message{{
					Role:    "user",
					Content: "test prompt",
				}},
				Stream: false,
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
