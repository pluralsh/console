package client

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Yamashou/gqlgenc/clientv2"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

func TestNewConsoleClientSanitizesResponseBodies(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		body       string
		wantError  string
	}{
		{
			name:       "invalid enum in response data",
			statusCode: http.StatusOK,
			body:       `{"data":{"myCluster":{"id":"cluster-id","name":"cluster","distro":"INVALID","token":"enum-token-secret","password":"enum-password-secret"}}}`,
			wantError:  "unmarshal gql error: INVALID is not a valid ClusterDistro",
		},
		{
			name:       "malformed json",
			statusCode: http.StatusOK,
			body:       `{"data":{"myCluster":{"name":"malformed-json-secret"}}`,
		},
		{
			name:       "malformed graphql errors",
			statusCode: http.StatusOK,
			body:       `{"errors":"malformed-errors-secret"}`,
		},
		{
			name:       "non success response",
			statusCode: http.StatusBadGateway,
			body:       `{"errors":[{"message":"safe graphql error"}],"token":"non-success-token-secret"}`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := newGraphQLTestServer(test.statusCode, test.body)
			defer server.Close()

			client := NewConsoleClient(server.Client(), server.URL, nil)
			_, err := client.MyCluster(context.Background())
			if err == nil {
				t.Fatal("MyCluster returned nil error")
			}

			assertSanitizedError(t, err, test.body)
			if test.wantError != "" && !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("error %q does not preserve decoder reason %q", err, test.wantError)
			}
		})
	}
}

func TestNewConsoleClientPreservesNonSuccessClassification(t *testing.T) {
	server := newGraphQLTestServer(http.StatusBadGateway, `{"errors":[{"message":"safe graphql error"}],"token":"status-token-secret"}`)
	defer server.Close()

	client := NewConsoleClient(server.Client(), server.URL, nil)
	_, err := client.MyCluster(context.Background())
	if err == nil {
		t.Fatal("MyCluster returned nil error")
	}

	var response *clientv2.ErrorResponse
	if !errors.As(err, &response) {
		t.Fatalf("expected GraphQL error response, got %T", err)
	}
	if response.NetworkError == nil || response.NetworkError.Code != http.StatusBadGateway {
		t.Fatalf("expected status %d, got %#v", http.StatusBadGateway, response.NetworkError)
	}
	if response.NetworkError.Message != sanitizedResponseMessage {
		t.Fatalf("expected sanitized network message %q, got %q", sanitizedResponseMessage, response.NetworkError.Message)
	}
	if !strings.Contains(err.Error(), sanitizedResponseMessage) {
		t.Fatalf("expected rendered error to contain %q, got %q", sanitizedResponseMessage, err)
	}
	if response.GqlErrors == nil || !strings.Contains(response.GqlErrors.Error(), "safe graphql error") {
		t.Fatalf("expected GraphQL errors to be preserved, got %#v", response.GqlErrors)
	}
	if strings.Contains(err.Error(), "status-token-secret") {
		t.Fatalf("error contains response secret: %q", err)
	}
}

func TestSanitizeErrorClonesNonSuccessResponse(t *testing.T) {
	graphqlErrors := gqlerror.List{{Message: "safe GraphQL error"}}
	original := &clientv2.ErrorResponse{
		NetworkError: &clientv2.HTTPError{Code: http.StatusBadGateway, Message: "raw response secret"},
		GqlErrors:    &graphqlErrors,
	}

	sanitized := (ErrorInterceptor{}).sanitize(original)
	if errors.Is(sanitized, original) {
		t.Fatal("expected a cloned error response")
	}

	var response *clientv2.ErrorResponse
	if !errors.As(sanitized, &response) {
		t.Fatalf("expected sanitized error response, got %T", sanitized)
	}
	if response.NetworkError.Code != http.StatusBadGateway || response.NetworkError.Message != sanitizedResponseMessage {
		t.Fatalf("unexpected sanitized network error: %#v", response.NetworkError)
	}
	if !errors.Is(response.GqlErrors, original.GqlErrors) {
		t.Fatal("GraphQL errors were not preserved")
	}
	if original.NetworkError.Message != "raw response secret" {
		t.Fatal("original error response was mutated")
	}
}

func TestNewConsoleClientPreservesGraphQLErrors(t *testing.T) {
	server := newGraphQLTestServer(http.StatusOK, `{"errors":[{"message":"access denied"}]}`)
	defer server.Close()

	client := NewConsoleClient(server.Client(), server.URL, nil)
	_, err := client.MyCluster(context.Background())
	if err == nil {
		t.Fatal("MyCluster returned nil error")
	}

	var response *clientv2.ErrorResponse
	if !errors.As(err, &response) {
		t.Fatalf("expected GraphQL error response, got %T", err)
	}
	if response.NetworkError != nil || response.GqlErrors == nil {
		t.Fatalf("expected only GraphQL errors, got %#v", response)
	}
	if !strings.Contains(err.Error(), "access denied") {
		t.Fatalf("GraphQL error was changed: %q", err)
	}
}

func TestNewConsoleClientSanitizesBeforeCallerInterceptors(t *testing.T) {
	const body = `{"data":{"myCluster":{"id":"cluster-id","name":"cluster","distro":"INVALID","token":"tracing-token-secret"}}}`
	server := newGraphQLTestServer(http.StatusOK, body)
	defer server.Close()

	var observed string
	tracingInterceptor := func(ctx context.Context, req *http.Request, info *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
		err := next(ctx, req, info, res)
		if err != nil {
			observed = err.Error()
		}
		return err
	}

	client := NewConsoleClient(server.Client(), server.URL, nil, tracingInterceptor)
	_, err := client.MyCluster(context.Background())
	if err == nil {
		t.Fatal("MyCluster returned nil error")
	}
	if strings.Contains(observed, body) || strings.Contains(observed, "tracing-token-secret") {
		t.Fatalf("caller interceptor observed raw response: %q", observed)
	}
	if observed != err.Error() {
		t.Fatalf("caller interceptor observed %q, returned %q", observed, err)
	}
}

func TestNewConsoleClientPreservesTransportErrors(t *testing.T) {
	transportErr := errors.New("dial failed")
	client := NewConsoleClient(&failingHTTPClient{err: transportErr}, "http://console.test/graphql", nil)

	_, err := client.MyCluster(context.Background())
	if err == nil {
		t.Fatal("MyCluster returned nil error")
	}
	if !errors.Is(err, transportErr) {
		t.Fatalf("transport error was not preserved: %v", err)
	}
	if got, want := err.Error(), "request failed: dial failed"; got != want {
		t.Fatalf("transport error changed from %q to %q", want, got)
	}
}

type failingHTTPClient struct {
	err error
}

func (c *failingHTTPClient) Do(*http.Request) (*http.Response, error) {
	return nil, c.err
}

func (c *failingHTTPClient) Post(string, string, io.Reader) (*http.Response, error) {
	return nil, c.err
}

func newGraphQLTestServer(statusCode int, body string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(statusCode)
		_, _ = fmt.Fprint(writer, body)
	}))
}

func assertSanitizedError(t *testing.T, err error, body string) {
	t.Helper()
	message := err.Error()
	if !strings.Contains(message, `operation "MyCluster"`) {
		t.Fatalf("error %q does not include operation name", message)
	}
	if strings.Contains(message, body) {
		t.Fatalf("error contains response body: %q", message)
	}
	for _, secret := range []string{
		"enum-token-secret",
		"enum-password-secret",
		"malformed-json-secret",
		"malformed-errors-secret",
		"non-success-secret",
		"non-success-token-secret",
	} {
		if strings.Contains(message, secret) {
			t.Fatalf("error contains secret %q: %q", secret, message)
		}
	}
}
