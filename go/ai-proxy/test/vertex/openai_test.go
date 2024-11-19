package vertex_test

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

	"github.com/pluralsh/console/go/ai-proxy/api/vertex"
	"github.com/pluralsh/console/go/ai-proxy/test/helpers"
)

func init() {
	_ = pflag.Set("provider", "vertex")
	_ = pflag.Set("provider-host", "localhost:8082")
	_ = pflag.Set("provider-service-account", "{\"type\":\"service_account\",\"project_id\":\"test\",\"private_key_id\":\"test\",\"private_key\":\"test\",\"client_email\":\"vertex@test.iam.gserviceaccount.com\",\"client_id\":\"12345\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"https://www.googleapis.com/robot/v1/metadata/x509/vertex%40test.iam.gserviceaccount.com\",\"universe_domain\":\"googleapis.com\"}")
	_ = os.Setenv(vertex.EnvLocation, "us-central1")
	_ = os.Setenv(vertex.EnvProjectID, "test")
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

	defer server.Close()
	defer providerServer.Close()
	os.Exit(m.Run())
}

func TestVertexProxy(t *testing.T) {
	cases := []helpers.TestStruct[any, any]{
		{
			Name:     "chat request should return correct ollama response",
			Method:   "POST",
			Endpoint: "/api/chat",
			Request: openai.ChatCompletionRequest{
				Model: "testmodel",
				Messages: []openai.Message{{
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
