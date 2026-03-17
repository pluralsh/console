package main

import (
	"net/http"

	"github.com/pluralsh/console/go/observability-proxy/internal/console"
)

func healthHandler() func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}
}

func readinessHandler(provider *console.CachingProvider) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !provider.Ready() {
			http.Error(w, "config not loaded", http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}
