package main

import (
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/environment"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

var (
	router *mux.Router
)

func init() {
	router = mux.NewRouter()

	// Registers all routes under /api group
	register(args.Provider(), args.ProviderHost(), args.ProviderToken())
}

func main() {
	klog.V(log.LogLevelMinimal).InfoS("Starting AI Proxy", "version", environment.Version, "provider", args.Provider())
	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), router); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
