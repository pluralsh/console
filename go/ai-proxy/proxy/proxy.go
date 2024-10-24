package proxy

import (
	"fmt"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/proxy/provider"
)

func NewOllamaTranslationProxy(p api.Provider, host string, token string) (api.TranslationProxy, error) {
	switch p {
	case api.ProviderOllama:
		return provider.NewOllamaProxy(host)
	case api.ProviderOpenAI:
		return provider.NewOpenAIProxy(host, token)
	case api.ProviderAnthropic:
		return nil, fmt.Errorf("unsupported provider: %s", p)
	}

	return nil, fmt.Errorf("invalid provider: %s", p)
}
