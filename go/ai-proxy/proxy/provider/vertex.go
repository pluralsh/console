package provider

import (
	"context"
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

type VertexProxy struct {
	*baseTranslationProxy

	serviceAccount string
	source         oauth2.TokenSource
}

func (in *VertexProxy) ModifyRequest(r *httputil.ProxyRequest) {
	in.baseTranslationProxy.ModifyRequest(r)

	token, err := in.source.Token()
	if err != nil {
		klog.ErrorS(err, "failed to fetch token")
		return
	}

	r.Out.Header.Add("Authorization", "Bearer "+token.AccessToken)
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
	case vertex.EndpointChat:
		return replaceResponseBody(r, openai.FromChatCompletionResponse)
	}

	return nil
}

func NewVertexProxy(target, serviceAccount string) (api.TranslationProxy, error) {
	credentials, err := google.CredentialsFromJSON(context.Background(), []byte(serviceAccount), "test")
	if err != nil {
		return nil, err
	}

	proxy := &VertexProxy{serviceAccount: serviceAccount, source: credentials.TokenSource}
	mapping := func(s string) string {
		switch s {
		case vertex.EnvProjectID:
			if len(credentials.ProjectID) > 0 {
				return credentials.ProjectID
			}

			if _, exists := os.LookupEnv(s); !exists {
				klog.Errorf("%s env var required but not found", vertex.EnvProjectID)
			}

			return os.Getenv(s)
		case vertex.EnvLocation:
			if _, exists := os.LookupEnv(s); !exists {
				klog.Errorf("%s env var required but not found", vertex.EnvLocation)
			}

			return os.Getenv(s)
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
