package provider

import (
	"github.com/pluralsh/console/go/ai-proxy/api"
)

type OllamaProxy struct {
	api.TranslationProxy
}

func NewOllamaProxy(host string) (api.TranslationProxy, error) {
	base, err := newBaseTranslationProxy(host, api.ProviderOllama, nil, nil, nil)
	if err != nil {
		return nil, err
	}

	return &OllamaProxy{
		TranslationProxy: base,
	}, nil
}
