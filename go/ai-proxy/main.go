package main

import (
	"net/http"
	"os"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/environment"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
	"github.com/pluralsh/console/go/ai-proxy/router"
)

func main() {
	klog.V(log.LogLevelMinimal).InfoS("Starting AI Proxy", "provider", args.Provider(), "version", environment.Version, "commit", environment.Commit)

	p, err := proxy.NewOllamaTranslationProxy(args.Provider(), args.ProviderHost(), args.ProviderCredentials())
	if err != nil {
		klog.ErrorS(err, "Could not create proxy")
		os.Exit(1)
	}

	handler := router.NewRouter(p)

	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), handler); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
