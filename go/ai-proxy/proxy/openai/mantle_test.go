package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"strings"
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

func TestOpenAIProxyUsesSigV4ForMantle(t *testing.T) {
	t.Setenv("AWS_ACCESS_KEY_ID", "test-access-key")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
	t.Setenv("AWS_EC2_METADATA_DISABLED", "true")

	tokenRotator := helpers.NewRoundRobinTokenRotator([]string{"openai-key"})
	proxy, err := NewOpenAIProxy("https://api.openai.com", tokenRotator, api.MantleConfig{
		AWSRegion:     "us-east-1",
		ModelPrefixes: []string{"gpt-5.6"},
		SigV4:         true,
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, ok := proxy.(*OpenAIProxy).proxy.Transport.(mantleSigV4RoundTripper); !ok {
		t.Fatal("expected Mantle SigV4 transport")
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
	proxy.Proxy().ServeHTTP(httptest.NewRecorder(), request)

	if gotRequest == nil {
		t.Fatal("expected proxy to make an upstream request")
	}
	if got := gotRequest.Header.Get("Authorization"); got != "" {
		t.Errorf("Authorization: got %q, want no Bearer authorization before SigV4 signing", got)
	}
}

func TestNewMantleSigV4RoundTripperRequiresRegion(t *testing.T) {
	_, err := newMantleSigV4RoundTripper(context.Background(), api.MantleConfig{SigV4: true})
	if err == nil {
		t.Fatal("expected missing AWS region to return an error")
	}
}

func TestMantleSigV4RoundTripperSignsMantleRequests(t *testing.T) {
	t.Setenv("AWS_ACCESS_KEY_ID", "test-access-key")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
	t.Setenv("AWS_EC2_METADATA_DISABLED", "true")

	var gotRequest *http.Request
	transport, err := newMantleSigV4RoundTripperWithBase(context.Background(), api.MantleConfig{
		AWSRegion: "us-east-1",
	}, roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		gotRequest = r
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(bytes.NewBufferString(`{}`)),
		}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}

	request, err := http.NewRequest(http.MethodPost, "https://bedrock-mantle.us-east-1.api.aws/openai/v1/responses", bytes.NewBufferString(`{"model":"openai.gpt-5.6"}`))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := transport.RoundTrip(request); err != nil {
		t.Fatal(err)
	}

	if gotRequest == nil {
		t.Fatal("expected signer to send an upstream request")
	}
	if got := gotRequest.Header.Get("Authorization"); !strings.HasPrefix(got, "AWS4-HMAC-SHA256") {
		t.Errorf("Authorization: got %q, want an AWS SigV4 authorization header", got)
	}
	if got := gotRequest.Header.Get("Authorization"); !strings.Contains(got, "/bedrock-mantle/aws4_request") {
		t.Errorf("Authorization: got %q, want the bedrock-mantle credential scope", got)
	}
	if gotRequest.Header.Get("X-Amz-Date") == "" {
		t.Error("expected X-Amz-Date header")
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
