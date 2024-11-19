package provider

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
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
	// mapping is a request path mapping function that can expand env variables in a path
	// with a custom values. See os.Expand mapping func for more information.
	mapping func(string) string
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

func (in *baseTranslationProxy) ModifyResponse(r *http.Response) (err error) {
	var reader io.Reader
	contentEncoding := r.Header.Get(headerContentEncoding)
	if len(contentEncoding) == 0 {
		return nil
	}

	switch strings.TrimSpace(contentEncoding) {
	case "br": // brotli
		r.Header.Del(headerContentEncoding)
		reader = brotli.NewReader(r.Body)
	case "gzip": // gzip
		r.Header.Del(headerContentEncoding)
		reader, err = gzip.NewReader(r.Body)
		if err != nil {
			return err
		}
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
	path = api.ToProviderAPIPath(in.provider, path)
	if in.mapping != nil {
		path = os.Expand(path, in.mapping)
	}

	return fmt.Sprintf("%s%s",
		in.baseTargetURL.String(),
		path,
	)
}

func newBaseTranslationProxy(
	target string,
	provider api.Provider,
	modifyRequest func(*httputil.ProxyRequest),
	modifyResponse func(*http.Response) error,
	mapping func(string) string,
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
		mapping,
	}
	if modifyRequest == nil {
		baseProxy.proxy.Rewrite = baseProxy.ModifyRequest
	}

	if modifyResponse == nil {
		baseProxy.proxy.ModifyResponse = baseProxy.ModifyResponse
	}

	return baseProxy, nil
}
