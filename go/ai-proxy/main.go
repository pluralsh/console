package main

import (
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/environment"
	"github.com/pluralsh/console/go/ai-proxy/internal/helpers"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
)

func main() {
	klog.V(log.LogLevelMinimal).InfoS("Starting AI Proxy", "provider", args.Provider(), "version", environment.Version, "commit", environment.Commit)

	router := mux.NewRouter()
	tokenRotator := helpers.NewRoundRobinTokenRotator(args.ProviderTokens())

	p, err := proxy.NewOllamaTranslationProxy(args.Provider(), args.ProviderHost(), args.ProviderServiceAccount(), tokenRotator)
	if err == nil {
		router.HandleFunc(ollama.EndpointChat, p.Proxy())
	} else if args.Provider() != api.ProviderBedrock {
		klog.ErrorS(err, "Could not create proxy")
		os.Exit(1)
	}

	if args.OpenAICompatible() {
		op, err := proxy.NewOpenAIProxy(args.Provider(), args.ProviderHost(), args.ProviderAwsRegion(), tokenRotator)
		if err != nil {
			klog.ErrorS(err, "Could not create proxy")
			os.Exit(1)
		}
		ep, err := proxy.NewOpenAIEmbeddingsProxy(args.Provider(), args.ProviderHost(), args.ProviderAwsRegion(), tokenRotator)
		if err != nil {
			klog.ErrorS(err, "Could not create embedding proxy")
			os.Exit(1)
		}
		router.HandleFunc(openai.EndpointChat, op.Proxy())
		router.HandleFunc(openai.EndpointEmbeddings, ep.Proxy())
	}

	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), router); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
