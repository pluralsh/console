package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
	"github.com/pluralsh/console/go/ai-proxy/router"
)

func SetupServer() (*httptest.Server, error) {
	p, err := proxy.NewOllamaTranslationProxy(args.Provider(), args.ProviderHost(), args.ProviderCredentials())
	if err != nil {
		return nil, err
	}

	return httptest.NewServer(router.NewRouter(p)), nil
}

func SetupProviderServer(handlers map[string]http.HandlerFunc) (*httptest.Server, error) {
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if handler, exists := handlers[request.URL.Path]; exists {
			handler(response, request)
			delete(handlers, request.URL.Path)
		}
	}))

	l, err := net.Listen("tcp", args.ProviderHost())
	if err != nil {
		return nil, err
	}

	server.Listener.Close()
	server.Listener = l
	server.Start()

	return server, nil
}

func CreateRequest[T any](method string, endpoint string, body T) func(requestServer *httptest.Server, externalServer *httptest.Server) ([]byte, error) {
	return func(requestServer *httptest.Server, externalServer *httptest.Server) ([]byte, error) {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequest(
			method,
			fmt.Sprintf("%s/%s", externalServer.URL, strings.TrimLeft(endpoint, "/")),
			io.NopCloser(bytes.NewReader(bodyBytes)),
		)
		if err != nil {
			return nil, err
		}

		res, err := requestServer.Client().Do(req)
		if err != nil {
			return nil, err
		}

		return io.ReadAll(res.Body)
	}
}

func MockResponse(endpoint string, response []byte, err error, status int) func(handlers map[string]http.HandlerFunc) error {
	return func(handlers map[string]http.HandlerFunc) error {
		if _, exists := handlers[endpoint]; exists {
			return fmt.Errorf("handler for endpoint %s already exists", endpoint)
		}

		handlers[endpoint] = func(writer http.ResponseWriter, _ *http.Request) {
			writer.WriteHeader(status)

			if err != nil {
				_, _ = writer.Write([]byte(err.Error()))
				return
			}

			_, _ = writer.Write(response)
		}

		return nil
	}
}
