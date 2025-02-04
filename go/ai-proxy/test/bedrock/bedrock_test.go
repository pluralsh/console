package bedrock

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/ollama/ollama/openai"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api/bedrock"
	"github.com/pluralsh/console/go/ai-proxy/test/helpers"
)

func init() {
	_ = pflag.Set("provider", "bedrock")
	_ = pflag.Set("provider-host", "localhost:8081")
	_ = pflag.Set("provider-region", "test")
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

func TestBedrockProxy(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request should return correct openai response",
			Method:   "POST",
			Endpoint: bedrock.EndpointChat,
			Request: openai.ChatCompletionRequest{
				Model: "anthropic.claude-v2",
				Messages: []openai.Message{{
					Role:    "user",
					Content: "test prompt",
				}},
				Stream: false,
			},
			WantData: openai.ChatCompletion{
				Model: "anthropic.claude-v2",
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

func TestBedrockProxy_Streaming(t *testing.T) {
	wantSSE := "data: test streaming response\n\n"

	streamTest := helpers.TestStruct[openai.ChatCompletionRequest, any]{
		Name:     "chat request with streaming should return SSE headers",
		Method:   "POST",
		Endpoint: bedrock.EndpointChat,
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
