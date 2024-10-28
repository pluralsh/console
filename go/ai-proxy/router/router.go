package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/pluralsh/console/go/ai-proxy/args"
)

func NewRouter() http.Handler {
	router := mux.NewRouter()

	// Registers all routes under /api group
	register(router, args.Provider(), args.ProviderHost(), args.ProviderToken())

	return router
}
