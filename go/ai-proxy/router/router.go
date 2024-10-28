package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
)

func NewRouter(proxy api.TranslationProxy) http.Handler {
	router := mux.NewRouter()

	// Register all Ollama API routes that should be proxied.
	router.HandleFunc(ollama.EndpointChat, proxy.Proxy())

	return router
}
