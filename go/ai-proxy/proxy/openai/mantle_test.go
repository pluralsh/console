package openai

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"testing"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/internal/helpers"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (in roundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return in(r)
}

func TestOpenAIProxyRoutesMatchingModelsToMantle(t *testing.T) {
	tokenRotator := helpers.NewRoundRobinTokenRotator([]string{"openai-key"})
	proxy, err := NewOpenAIProxy("https://api.openai.com", tokenRotator, api.MantleConfig{
		APIKey:        "mantle-key",
		AWSRegion:     "us-east-1",
		ModelPrefixes: []string{"gpt-5.6"},
	})
	if err != nil {
		t.Fatal(err)
	}

	var gotRequest *http.Request
	proxy.(*OpenAIProxy).proxy.Transport = roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		gotRequest = r
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(bytes.NewBufferString(`{}`)),
		}, nil
	})

	request := httptest.NewRequest(http.MethodPost, "/openai/v1/responses", bytes.NewBufferString(`{"model":"gpt-5.6-terra","input":"test"}`))
	response := httptest.NewRecorder()
	proxy.Proxy().ServeHTTP(response, request)

	if gotRequest == nil {
		t.Fatal("expected proxy to make an upstream request")
	}
	if got, want := gotRequest.URL.String(), "https://bedrock-mantle.us-east-1.api.aws/openai/v1/responses"; got != want {
		t.Errorf("URL: got %q, want %q", got, want)
	}
	if got, want := gotRequest.Header.Get("Authorization"), "Bearer mantle-key"; got != want {
		t.Errorf("Authorization: got %q, want %q", got, want)
	}

	body, err := io.ReadAll(gotRequest.Body)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatal(err)
	}
	if got, want := payload["model"], "openai.gpt-5.6-terra"; got != want {
		t.Errorf("model: got %q, want %q", got, want)
	}
}

func TestOpenAIProxyRoutesBedrockModelWithoutRewritingIt(t *testing.T) {
	tokenRotator := helpers.NewRoundRobinTokenRotator([]string{"openai-key"})
	proxy, err := NewOpenAIProxy("https://api.openai.com", tokenRotator, api.MantleConfig{
		APIKey:        "mantle-key",
		AWSRegion:     "us-east-1",
		ModelPrefixes: []string{"gpt-5.6"},
	})
	if err != nil {
		t.Fatal(err)
	}

	var gotRequest *http.Request
	proxy.(*OpenAIProxy).proxy.Transport = roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		gotRequest = r
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(bytes.NewBufferString(`{}`)),
		}, nil
	})

	requestBody := `{"model":"openai.gpt-5.6-terra","input":"test"}`
	request := httptest.NewRequest(http.MethodPost, "/openai/v1/responses", bytes.NewBufferString(requestBody))
	response := httptest.NewRecorder()
	proxy.Proxy().ServeHTTP(response, request)

	if gotRequest == nil {
		t.Fatal("expected proxy to make an upstream request")
	}
	if got, want := gotRequest.URL.String(), "https://bedrock-mantle.us-east-1.api.aws/openai/v1/responses"; got != want {
		t.Errorf("URL: got %q, want %q", got, want)
	}
	if got, want := gotRequest.Header.Get("Authorization"), "Bearer mantle-key"; got != want {
		t.Errorf("Authorization: got %q, want %q", got, want)
	}

	body, err := io.ReadAll(gotRequest.Body)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := string(body), requestBody; got != want {
		t.Errorf("body: got %q, want %q", got, want)
	}
}

func TestRouteToMantle(t *testing.T) {
	request := &http.Request{
		Body: io.NopCloser(bytes.NewBufferString(`{"model":"gpt-5.6-terra","input":"test"}`)),
	}
	proxyRequest := &httputil.ProxyRequest{
		In:  request,
		Out: request.Clone(request.Context()),
	}

	if !routeToMantle(proxyRequest, []string{"gpt-5.6"}) {
		t.Fatal("expected GPT-5.6 request to route to Mantle")
	}

	body, err := io.ReadAll(proxyRequest.Out.Body)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatal(err)
	}
	if got, want := payload["model"], "openai.gpt-5.6-terra"; got != want {
		t.Errorf("model: got %q, want %q", got, want)
	}
}

func TestRouteToMantleLeavesOtherModelsUnchanged(t *testing.T) {
	request := &http.Request{
		Body: io.NopCloser(bytes.NewBufferString(`{"model":"gpt-4.1","input":"test"}`)),
	}
	proxyRequest := &httputil.ProxyRequest{
		In:  request,
		Out: request.Clone(request.Context()),
	}

	if routeToMantle(proxyRequest, []string{"gpt-5.6"}) {
		t.Fatal("expected non-matching model to stay on the OpenAI upstream")
	}

	body, err := io.ReadAll(proxyRequest.Out.Body)
	if err != nil {
		t.Fatal(err)
	}
	if got, want := string(body), `{"model":"gpt-4.1","input":"test"}`; got != want {
		t.Errorf("body: got %s, want %s", got, want)
	}
}
