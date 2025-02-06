package main

import (
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/bedrock"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/environment"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
)

func main() {
	klog.V(log.LogLevelMinimal).InfoS("Starting AI Proxy", "provider", args.Provider(), "version", environment.Version, "commit", environment.Commit)

	p, err := proxy.NewOllamaTranslationProxy(args.Provider(), args.ProviderHost(), args.ProviderCredentials())
	if err != nil {
		klog.ErrorS(err, "Could not create proxy")
		os.Exit(1)
	}

	op, err := proxy.NewOpenAIProxy(api.ProviderOpenAI, args.ProviderHost(), args.ProviderCredentials())
	if err != nil {
		klog.ErrorS(err, "Could not create proxy")
		os.Exit(1)
	}

	bp, err := proxy.NewBedrockProxy(api.ProviderBedrock, args.ProviderCredentials())
	if err != nil {
		klog.ErrorS(err, "Could not create proxy")
		os.Exit(1)
	}

	router := mux.NewRouter()
	router.HandleFunc(ollama.EndpointChat, p.Proxy())
	router.HandleFunc(openai.EndpointChat, op.Proxy())
	router.HandleFunc(bedrock.EndpointChat, bp.Proxy())

	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), router); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
