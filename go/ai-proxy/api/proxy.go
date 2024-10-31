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
