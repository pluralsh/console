package provider

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/api/vertex"
)

const (
	scope = "https://www.googleapis.com/auth/cloud-platform.read-only"
)

type VertexProxy struct {
	*baseTranslationProxy

	source oauth2.TokenSource
}

func (in *VertexProxy) ModifyRequest(r *httputil.ProxyRequest) {
	in.baseTranslationProxy.ModifyRequest(r)

	token, err := in.source.Token()
	if err != nil {
		klog.ErrorS(err, "failed to fetch token")
		return
	}

	token.SetAuthHeader(r.Out)
	r.SetXForwarded()

	err = in.modifyRequestBody(r)
	if err != nil {
		klog.ErrorS(err, "failed to map request body")
		return
	}
}

func (in *VertexProxy) ModifyResponse(r *http.Response) error {
	if err := in.baseTranslationProxy.ModifyResponse(r); err != nil {
		return err
	}

	err := in.modifyResponseBody(r)
	if err != nil {
		klog.ErrorS(err, "failed to map response body")
		return err
	}

	return nil
}

func (in *VertexProxy) modifyRequestBody(r *httputil.ProxyRequest) error {
	endpoint := r.Out.URL.Path
	switch endpoint {
	case os.Expand(vertex.EndpointChat, in.mapping):
		return replaceRequestBody(r, openai.ToChatCompletionRequest)
	}

	return nil
}

func (in *VertexProxy) modifyResponseBody(r *http.Response) error {
	if r.StatusCode != http.StatusOK {
		return replaceResponseBody(r, vertex.FromErrorResponse(r.StatusCode))
	}

	endpoint := r.Request.URL.Path
	switch endpoint {
	case os.Expand(vertex.EndpointChat, in.mapping):
		return replaceResponseBody(r, openai.FromChatCompletionResponse)
	}

	return nil
}

func NewVertexProxy(target string, serviceAccount []string) (api.TranslationProxy, error) {
	if len(serviceAccount) == 0 {
		return nil, fmt.Errorf("service account cannot be empty")
	}
	credentials, err := google.CredentialsFromJSON(context.Background(), []byte(serviceAccount[0]), scope)
	if err != nil {
		return nil, err
	}

	location := os.Getenv(vertex.EnvLocation)
	projectID := credentials.ProjectID
	if len(projectID) == 0 {
		projectID = os.Getenv(vertex.EnvProjectID)
	}

	if len(location) == 0 || len(projectID) == 0 {
		return nil, fmt.Errorf("one of %s, %s environment variables not set", vertex.EnvLocation, vertex.EnvProjectID)
	}

	proxy := &VertexProxy{source: credentials.TokenSource}
	mapping := func(s string) string {
		switch s {
		case vertex.EnvProjectID:
			return projectID
		case vertex.EnvLocation:
			return location
		}

		return s
	}

	base, err := newBaseTranslationProxy(target, api.ProviderVertex, proxy.ModifyRequest, proxy.ModifyResponse, mapping)
	if err != nil {
		return nil, err
	}

	proxy.baseTranslationProxy = base
	return proxy, nil
}
