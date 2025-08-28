package proxy

import (
	"fmt"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/internal/helpers"
	"github.com/pluralsh/console/go/ai-proxy/proxy/bedrock"
	"github.com/pluralsh/console/go/ai-proxy/proxy/ollama"
	"github.com/pluralsh/console/go/ai-proxy/proxy/openai"
	"github.com/pluralsh/console/go/ai-proxy/proxy/provider"
)

func NewOllamaTranslationProxy(p api.Provider, host, serviceAccount string, tokenRotator *helpers.RoundRobinTokenRotator) (api.TranslationProxy, error) {
	switch p {
	case api.ProviderOllama:
		return provider.NewOllamaProxy(host)
	case api.ProviderOpenAI:
		return provider.NewOpenAIProxy(host, tokenRotator)
	case api.ProviderVertex:
		return provider.NewVertexProxy(host, serviceAccount)
	case api.ProviderAnthropic:
		return nil, fmt.Errorf("unsupported provider: %s", p)
	}

	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewOpenAIProxy(p api.Provider, host, region string, tokenRotator *helpers.RoundRobinTokenRotator) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderOpenAI:
		return openai.NewOpenAIProxy(host, tokenRotator)
	case api.ProviderBedrock:
		return bedrock.NewBedrockProxy(region)
	case api.ProviderOllama:
		return ollama.NewOllamaProxy(host)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}

func NewOpenAIEmbeddingsProxy(p api.Provider, host, region string, tokenRotator *helpers.RoundRobinTokenRotator) (api.OpenAIProxy, error) {
	switch p {
	case api.ProviderOpenAI:
		return openai.NewOpenAIEmbeddingsProxy(host, tokenRotator)
	case api.ProviderBedrock:
		return bedrock.NewBedrockEmbeddingsProxy(region)
	case api.ProviderOllama:
		return ollama.NewOllamaEmbeddingsProxy(host)
	}
	return nil, fmt.Errorf("invalid provider: %s", p)
}
