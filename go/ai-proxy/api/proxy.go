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

type MantleConfig struct {
	APIKey        string
	AWSRegion     string
	ModelPrefixes []string
}

func (in MantleConfig) Enabled() bool {
	return in.APIKey != ""
}
