package openai

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
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
	AddToken(token string)
	RemoveToken(token string)
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

	currentIndex := rr.index.Add(1) - 1
	return rr.tokens[currentIndex%uint32(len(rr.tokens))]
}

func (rr *RoundRobinTokenRotator) AddToken(token string) {
	rr.mu.Lock()
	defer rr.mu.Unlock()

	rr.tokens = append(rr.tokens, token)
	rr.index.Store(0) // Reset index when modifying tokens
}

func (rr *RoundRobinTokenRotator) RemoveToken(token string) {
	rr.mu.Lock()
	defer rr.mu.Unlock()

	for i, t := range rr.tokens {
		if t == token {
			rr.tokens[i] = rr.tokens[len(rr.tokens)-1]
			rr.tokens = rr.tokens[:len(rr.tokens)-1]
			rr.index.Store(0) // Reset index when modifying tokens
			return
		}
	}
}

func (o *OpenAIProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		o.proxy.ServeHTTP(w, r)
	}
}

type RetryTransport struct {
	tokenRotator TokenRotator
	base         http.RoundTripper
}

func (t *RetryTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Try each token until success or we run out
	for {
		resp, err := t.base.RoundTrip(req)
		if err != nil || resp.StatusCode != http.StatusUnauthorized {
			return resp, err
		}

		// Extract and remove failed token
		token := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
		t.tokenRotator.RemoveToken(token)

		nextToken := t.tokenRotator.GetNextToken()
		if nextToken == "" {
			klog.ErrorS(nil, "no more valid tokens available")
			return resp, nil // No more tokens, return 401
		}

		req.Header.Set("Authorization", "Bearer "+nextToken)
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
		Transport: &RetryTransport{
			tokenRotator: tokenRotator,
			base:         http.DefaultTransport,
		},
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
