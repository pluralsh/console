package provider

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/andybalholm/brotli"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

const (
	headerContentEncoding = "Content-Encoding"
)

type baseTranslationProxy struct {
	baseTargetURL *url.URL
	proxy         *httputil.ReverseProxy
	provider      api.Provider
}

func (in *baseTranslationProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		in.proxy.ServeHTTP(w, r)
	}
}

func (in *baseTranslationProxy) ModifyRequest(r *httputil.ProxyRequest) {
	targetURL := in.targetURL(r.In.URL.Path)
	u, err := url.Parse(targetURL)
	if err != nil {
		klog.ErrorS(err, "failed to parse target url")
		return
	}

	r.Out.URL = u
	r.Out.Host = r.Out.URL.Host

	klog.V(log.LogLevelDebug).InfoS(
		"proxying request",
		"from", fmt.Sprintf("%s%s", r.In.RemoteAddr, r.In.URL.Path),
		"to", targetURL)
}

func (in *baseTranslationProxy) ModifyResponse(r *http.Response) error {
	var reader io.Reader
	contentEncoding := r.Header.Get(headerContentEncoding)
	if len(contentEncoding) == 0 {
		return nil
	}

	switch strings.TrimSpace(contentEncoding) {
	case "br": // brotli
		r.Header.Del(headerContentEncoding)
		reader = brotli.NewReader(r.Body)
	}

	respBody, err := io.ReadAll(reader)
	if err != nil {
		return err
	}

	r.ContentLength = int64(len(respBody))
	r.Body = io.NopCloser(bytes.NewReader(respBody))
	return nil
}

func (in *baseTranslationProxy) targetURL(path string) string {
	return fmt.Sprintf("%s%s",
		in.baseTargetURL.String(),
		api.ToProviderAPIPath(in.provider, path),
	)
}

func newBaseTranslationProxy(
	target string,
	provider api.Provider,
	modifyRequest func(*httputil.ProxyRequest),
	modifyResponse func(*http.Response) error,
) (*baseTranslationProxy, error) {
	const urlPathSeparator = "/"
	baseTargetURL, err := url.Parse(strings.TrimRight(target, urlPathSeparator))
	if err != nil {
		return nil, err
	}

	baseProxy := &baseTranslationProxy{
		baseTargetURL,
		&httputil.ReverseProxy{
			Rewrite:        modifyRequest,
			ModifyResponse: modifyResponse,
		},
		provider,
	}
	if modifyRequest == nil {
		baseProxy.proxy.Rewrite = baseProxy.ModifyRequest
	}

	if modifyResponse == nil {
		baseProxy.proxy.ModifyResponse = baseProxy.ModifyResponse
	}

	return baseProxy, nil
}
