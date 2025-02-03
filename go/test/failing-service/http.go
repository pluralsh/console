package main

import (
	"net/http"

	"github.com/pluralsh/console/go/test/failing-service/args"
)

const (
	defaultPath = "/api/mock"
)

func start() error {
	mux := http.NewServeMux()
	mux.HandleFunc(defaultPath, mockHandler)

	return http.ListenAndServe(args.Address(), mux)
}

func mockHandlerModifier() func(w http.ResponseWriter, r *http.Request) {
	switch args.ResponseBehaviorModifier() {
	case args.BehaviorModifierNone:

	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}
}
