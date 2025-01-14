package proxy

import (
	"fmt"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/proxy/provider"
)

func NewTranslationProxy(p api.Provider, host string, credentials string) (api.TranslationProxy, error) {
	switch p {
	case api.ProviderOllama:
		return provider.NewOllamaProxy(host)
	case api.ProviderOpenAI:
		return provider.NewOpenAIProxy(host, credentials)
	case api.ProviderOpenAIStandard:
		return provider.NewOpenAIStandardProxy(host)
	case api.ProviderVertex:
		return provider.NewVertexProxy(host, credentials)
	case api.ProviderAnthropic:
		return nil, fmt.Errorf("unsupported provider: %s", p)
	}

	return nil, fmt.Errorf("invalid provider: %s", p)
}
