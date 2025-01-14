package provider

import (
	"github.com/pluralsh/console/go/ai-proxy/api"
)

type OpenAIStandardProxy struct {
	api.TranslationProxy
}

func NewOpenAIStandardProxy(host string) (api.TranslationProxy, error) {
	base, err := newBaseTranslationProxy(host, api.ProviderOpenAIStandard, nil, nil, nil)
	if err != nil {
		return nil, err
	}

	return &OpenAIStandardProxy{
		TranslationProxy: base,
	}, nil
}
