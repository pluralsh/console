package router

import (
	"github.com/gorilla/mux"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
)

func register(router *mux.Router, provider api.Provider, host string, token string) {
	p, err := proxy.NewOllamaTranslationProxy(provider, host, token)
	if err != nil {
		panic(err)
	}

	router.Use()

	// Register all Ollama API routes that should be proxied.
	router.HandleFunc(ollama.EndpointChat, p.Proxy())
}
