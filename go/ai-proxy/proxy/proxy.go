package proxy

import (
	"fmt"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/proxy/bedrock"
	"github.com/pluralsh/console/go/ai-proxy/proxy/openai"
	"github.com/pluralsh/console/go/ai-proxy/proxy/provider"
)

func NewOllamaTranslationProxy(p api.Provider, host string, credentials string) (api.TranslationProxy, error) {
	switch p {
	case api.ProviderOllama:
		return provider.NewOllamaProxy(host)
	case api.ProviderOpenAI:
		return provider.NewOpenAIProxy(host, credentials)
	case api.ProviderVertex:
		return provider.NewVertexProxy(host, credentials)
	case api.ProviderAnthropic:
		return nil, fmt.Errorf("unsupported provider: %s", p)
	}

	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewOpenAIProxy(p api.Provider, host, token string) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderOpenAI:
		return openai.NewOpenAIProxy(host, token)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewOpenAIEmbeddingsProxy(p api.Provider, host, token string) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderOpenAI:
		return openai.NewOpenAIEmbeddingsProxy(host, token)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewBedrockProxy(p api.Provider, region string) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderBedrock:
		return bedrock.NewBedrockProxy(region)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewBedrockEmbeddingsProxy(p api.Provider, region string) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderBedrock:
		return bedrock.NewBedrockEmbeddingsProxy(region)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}
