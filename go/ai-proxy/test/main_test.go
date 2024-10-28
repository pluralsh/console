package main_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/spf13/pflag"

	"github.com/pluralsh/console/go/ai-proxy/router"
)

func init() {
	pflag.Set("provider-host", "localhost")
}

var (
	server *httptest.Server
)

func TestMain(m *testing.M) {
	server = httptest.NewServer(router.NewRouter(nil))
}

func createRequest[T any](method string, url string, body T) (*http.Request, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	return http.NewRequest(method, url, io.NopCloser(bytes.NewReader(bodyBytes)))
}

func TestOpenAIProxy(t *testing.T) {
	//applicationHandler := router.NewRouter(nil)
	//server = httptest.NewServer(applicationHandler)
	//defer server.Close()
	//
	//req, err := createRequest("POST", fmt.Sprintf("%s/api/chat", server.URL), ollamaapi.ChatRequest{
	//	Model: "testmodel",
	//	Messages: []ollamaapi.Message{{
	//		Role:    "user",
	//		Content: "test prompt",
	//	}},
	//})
	//if err != nil {
	//	t.Fatalf("%s", err)
	//}
	//
	//res, err := server.Client().Do(req)
	//if err != nil {
	//	t.Fatalf("%s", err)
	//}
	//
	//defer res.Body.Close()
	//greeting, err := io.ReadAll(res.Body)
	//
	//if err != nil {
	//	log.Fatalf("%s", err)
	//}
	//
	//want := []byte("Hello World!")
	//
	//if !bytes.Equal(want, greeting) {
	//	t.Errorf("Expected greeting %s; got %s", want, greeting)
	//}
}
