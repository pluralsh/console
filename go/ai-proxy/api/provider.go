package api

import (
	"fmt"

	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
)

type Provider string

func (in Provider) String() string {
	return string(in)
}

func ToProvider(s string) (Provider, error) {
	switch s {
	case ProviderOllama.String():
		return ProviderOllama, nil
	case ProviderOpenAI.String():
		return ProviderOpenAI, nil
	case ProviderAnthropic.String():
		return ProviderAnthropic, nil
	}

	return "", fmt.Errorf("invalid provider: %s", s)
}

const (
	ProviderOpenAI    Provider = "openai"
	ProviderAnthropic Provider = "anthropic"
	ProviderOllama    Provider = "ollama"
)

type OllamaAPI string

type ProviderAPIMapping map[string]string

var (
	ollamaToOpenAI ProviderAPIMapping = map[string]string{
		ollama.EndpointChat: openai.EndpointChat,
	}
)

func ToProviderAPIPath(target Provider, path string) string {
	switch target {
	case ProviderOllama:
		return path
	case ProviderOpenAI:
		targetPath, exists := ollamaToOpenAI[path]
		if !exists {
			panic(fmt.Sprintf("path %s not registered for provider %s", path, target))
		}

		return targetPath
	}

	panic(fmt.Sprintf("invalid provider: %s", target))
}
