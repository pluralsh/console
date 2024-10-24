package provider

import (
	"net/http"
	"net/http/httputil"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
)

type OpenAIProxy struct {
	*baseTranslationProxy

	token string
}

func (in *OpenAIProxy) ModifyRequest(r *httputil.ProxyRequest) {
	in.baseTranslationProxy.ModifyRequest(r)

	r.Out.Header.Add("Authorization", "Bearer "+in.token)
	r.SetXForwarded()

	err := in.modifyRequestBody(r)
	if err != nil {
		klog.ErrorS(err, "failed to map request body")
		return
	}
}

func (in *OpenAIProxy) modifyRequestBody(r *httputil.ProxyRequest) error {
	endpoint := r.Out.URL.Path
	switch endpoint {
	case openai.EndpointChat:
		return hijackRequest(r, openai.ToChatCompletionRequest)
	}

	return nil
}

func (in *OpenAIProxy) ModifyResponse(r *http.Response) error {
	err := in.modifyResponseBody(r)
	if err != nil {
		klog.ErrorS(err, "failed to map request body")
		return err
	}

	return nil
}

func (in *OpenAIProxy) modifyResponseBody(r *http.Response) error {
	endpoint := r.Request.URL.Path
	switch endpoint {
	case openai.EndpointChat:
		return hijackResponse(r, openai.FromChatCompletionResponse)
	}

	return nil
}

func NewOpenAIProxy(target, token string) (api.TranslationProxy, error) {
	proxy := &OpenAIProxy{token: token}
	base, err := newBaseTranslationProxy(target, api.ProviderOpenAI, proxy.ModifyRequest, proxy.ModifyResponse)
	if err != nil {
		return nil, err
	}

	proxy.baseTranslationProxy = base
	return proxy, nil
}
