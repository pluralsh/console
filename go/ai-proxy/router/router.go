package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/api/openai_standard"
)

func NewRouter(proxy api.TranslationProxy) http.Handler {
	router := mux.NewRouter()

	// Register all Ollama API routes that should be proxied.
	router.HandleFunc(ollama.EndpointChat, proxy.Proxy())

	// Register OpenAI API routes  (ollama/openai --> openai
	//router.HandleFunc(openai_standard.EndpointChat, proxy.Proxy())

	return router
}

func NewOpenAIRouter(proxy api.OpenAIProxy) http.Handler {
	router := mux.NewRouter()

	router.HandleFunc(openai_standard.EndpointChat, proxy.Proxy())
	return router
}
