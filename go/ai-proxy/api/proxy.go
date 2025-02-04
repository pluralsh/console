package api

import (
	"net/http"
	"net/http/httputil"
)

type TranslationProxy interface {
	Proxy() http.HandlerFunc
	ModifyRequest(*httputil.ProxyRequest)
	ModifyResponse(*http.Response) error
}

type OpenAIProxy interface {
	Proxy() http.HandlerFunc
}

type BedrockAIProxy interface {
	Proxy() http.HandlerFunc
}
