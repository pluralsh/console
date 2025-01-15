package main

import (
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
	"github.com/pluralsh/console/go/ai-proxy/api/openai_standard"
	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
)

func main() {
	provider := args.Provider()
	host := args.ProviderHost()
	creds := args.ProviderCredentials()

	var translationProxy api.TranslationProxy
	if provider != api.ProviderOpenAIStandard {
		tp, err := proxy.NewTranslationProxy(provider, host, creds)
		if err != nil {
			klog.ErrorS(err, "Could not create translation proxy")
			os.Exit(1)
		}
		translationProxy = tp
	} else {
		translationProxy = nil
	}

	var openaiProxy api.OpenAIProxy
	if provider == api.ProviderOpenAIStandard {
		op, err := proxy.NewOpenAIProxy(provider, host, creds)
		if err != nil {
			klog.ErrorS(err, "Could not create openai proxy")
			os.Exit(1)
		}
		openaiProxy = op
	} else {
		openaiProxy = nil
	}

	router := mux.NewRouter()

	if translationProxy != nil {
		router.HandleFunc(ollama.EndpointChat, translationProxy.Proxy())
	}

	if openaiProxy != nil {
		router.HandleFunc(openai_standard.EndpointChat, openaiProxy.Proxy())
	}

	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), router); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
