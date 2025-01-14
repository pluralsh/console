package main

import (
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api/openai_standard"
	"github.com/pluralsh/console/go/ai-proxy/args"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
	"github.com/pluralsh/console/go/ai-proxy/proxy"
)

func main() {
	//p, err := proxy.NewTranslationProxy(args.Provider(), args.ProviderHost(), args.ProviderCredentials())
	//if err != nil {
	//	klog.ErrorS(err, "Could not create translation proxy")
	//	os.Exit(1)
	//}

	op, err := proxy.NewOpenAIProxy(args.Provider(), args.ProviderHost())
	if err != nil {
		klog.ErrorS(err, "Could not create openai proxy")
		os.Exit(1)
	}

	router := mux.NewRouter()
	//router.HandleFunc(ollama.EndpointChat, p.Proxy())
	router.HandleFunc(openai_standard.EndpointChat, op.Proxy())

	klog.V(log.LogLevelMinimal).InfoS("Listening and serving HTTP", "address", args.Address())
	if err := http.ListenAndServe(args.Address(), router); err != nil {
		klog.ErrorS(err, "Could not run the router")
		os.Exit(1)
	}
}
