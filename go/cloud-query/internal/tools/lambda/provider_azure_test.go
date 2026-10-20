package lambda

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/resourcemanager/appservice/armappservice/v2"
)

const notFoundBody = `{"error":{"code":"NotFound","message":"not found"}}`

type fakeCredential struct{}

func (fakeCredential) GetToken(context.Context, policy.TokenRequestOptions) (azcore.AccessToken, error) {
	return azcore.AccessToken{Token: "token", ExpiresOn: time.Now().Add(time.Hour)}, nil
}

// fakeARM answers ARM calls by the path suffix of the request; unknown paths are 404.
type fakeARM map[string]string

func (f fakeARM) Do(req *http.Request) (*http.Response, error) {
	status, body := http.StatusNotFound, notFoundBody
	for suffix, resp := range f {
		if strings.HasSuffix(req.URL.Path, suffix) {
			status, body = http.StatusOK, resp
			break
		}
	}

	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    req,
	}, nil
}

func newFakeWebAppsClient(t *testing.T, responses fakeARM) *armappservice.WebAppsClient {
	t.Helper()
	client, err := armappservice.NewWebAppsClient("sub-1", fakeCredential{}, &arm.ClientOptions{
		ClientOptions: policy.ClientOptions{
			Transport: responses,
			Retry:     policy.RetryOptions{MaxRetries: -1},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	return client
}

func TestResolveInvokeURL(t *testing.T) {
	t.Parallel()
	provider := &AzureProvider{}
	ref := azureFunctionRef{subscriptionID: "sub-1", resourceGroup: "rg", siteName: "site", functionName: "f"}
	function := `{"properties":{"invoke_url_template":"https://site.azurewebsites.net/api/f"}}`
	hostKeys := `{"functionKeys":{"default":"host-key"}}`

	t.Run("prefers flat function keys when function secrets are unavailable", func(t *testing.T) {
		t.Parallel()
		client := newFakeWebAppsClient(t, fakeARM{
			"/functions/f":           function,
			"/functions/f/listkeys":  `{"default":"function-key"}`,
			"/host/default/listkeys": hostKeys,
		})

		got, err := provider.resolveInvokeURL(context.Background(), client, ref)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if want := "https://site.azurewebsites.net/api/f?code=function-key"; got != want {
			t.Fatalf("unexpected url: got %q want %q", got, want)
		}
	})

	t.Run("reads function keys nested under properties", func(t *testing.T) {
		t.Parallel()
		client := newFakeWebAppsClient(t, fakeARM{
			"/functions/f":           function,
			"/functions/f/listkeys":  `{"properties":{"default":"function-key"}}`,
			"/host/default/listkeys": hostKeys,
		})

		got, err := provider.resolveInvokeURL(context.Background(), client, ref)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if want := "https://site.azurewebsites.net/api/f?code=function-key"; got != want {
			t.Fatalf("unexpected url: got %q want %q", got, want)
		}
	})

	t.Run("falls back to host keys when function keys can't be listed", func(t *testing.T) {
		t.Parallel()
		client := newFakeWebAppsClient(t, fakeARM{
			"/functions/f":           function,
			"/host/default/listkeys": hostKeys,
		})

		got, err := provider.resolveInvokeURL(context.Background(), client, ref)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if want := "https://site.azurewebsites.net/api/f?code=host-key"; got != want {
			t.Fatalf("unexpected url: got %q want %q", got, want)
		}
	})

	t.Run("uses function secrets when available", func(t *testing.T) {
		t.Parallel()
		client := newFakeWebAppsClient(t, fakeARM{
			"/functions/f/listsecrets": `{"key":"secret-key","trigger_url":"https://site.azurewebsites.net/api/f"}`,
			"/functions/f/listkeys":    `{"default":"function-key"}`,
		})

		got, err := provider.resolveInvokeURL(context.Background(), client, ref)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if want := "https://site.azurewebsites.net/api/f?code=secret-key"; got != want {
			t.Fatalf("unexpected url: got %q want %q", got, want)
		}
	})
}
