package openai

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
	"sync/atomic"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/openai"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

type OpenAIProxy struct {
	proxy        *httputil.ReverseProxy
	tokenRotator TokenRotator
}

type TokenRotator interface {
	GetNextToken() string
}

type RoundRobinTokenRotator struct {
	tokens []string
	mu     sync.RWMutex
	index  atomic.Uint32
}

func NewRoundRobinTokenRotator(tokens []string) *RoundRobinTokenRotator {
	tokenCpy := make([]string, len(tokens))
	copy(tokenCpy, tokens)

	return &RoundRobinTokenRotator{
		tokens: tokenCpy,
	}
}

func (rr *RoundRobinTokenRotator) GetNextToken() string {
	rr.mu.RLock()
	defer rr.mu.RUnlock()

	if len(rr.tokens) == 0 {
		return ""
	}

	currentIndex := rr.index.Load()
	rr.index.Add(1)
	return rr.tokens[currentIndex%uint32(len(rr.tokens))]
}

func (o *OpenAIProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		o.proxy.ServeHTTP(w, r)
	}
}

func NewOpenAIProxy(host string, tokenRotator *RoundRobinTokenRotator) (api.OpenAIProxy, error) {
	if len(tokenRotator.tokens) == 0 {
		return nil, fmt.Errorf("at least one token is required")
	}

	parsedURL, err := url.Parse(host)
	if err != nil {
		return nil, err
	}

	reverse := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.Header.Set("Authorization", "Bearer "+tokenRotator.GetNextToken())

			r.SetXForwarded()

			targetURL, err := url.Parse(openai.EndpointChatCompletions)
			if err != nil {
				klog.ErrorS(err, "failed to parse target url")
				return
			}

			r.Out.URL.Scheme = parsedURL.Scheme
			r.Out.URL.Host = parsedURL.Host
			r.Out.Host = parsedURL.Host
			r.Out.URL.Path = targetURL.Path

			klog.V(log.LogLevelDebug).InfoS(
				"proxying request",
				"from", fmt.Sprintf("%s %s", r.In.Method, r.In.URL.Path),
				"to", r.Out.URL.String(),
			)
		},
	}

	return &OpenAIProxy{
		proxy:        reverse,
		tokenRotator: tokenRotator,
	}, nil
}
