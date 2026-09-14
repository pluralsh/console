package plural

import (
	"context"
	"crypto/tls"
	"net/http"

	console "github.com/pluralsh/console/go/client"
)

type authedTransport struct {
	token   string
	wrapped http.RoundTripper
}

func (t *authedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("Authorization", "Token "+t.token)
	return t.wrapped.RoundTrip(req)
}

type Client struct {
	ctx     context.Context
	Console console.ConsoleClient
}

func transport(insecureSkipTLSVerify bool) http.RoundTripper {
	base := http.DefaultTransport.(*http.Transport).Clone()
	if insecureSkipTLSVerify {
		base.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
	}
	return base
}

func New(url, token string, insecureSkipTLSVerify ...bool) *Client {
	insecure := len(insecureSkipTLSVerify) > 0 && insecureSkipTLSVerify[0]
	httpClient := http.Client{
		Transport: &authedTransport{
			token:   token,
			wrapped: transport(insecure),
		},
	}

	return &Client{
		Console: console.New(&httpClient, url, nil),
		ctx:     context.Background(),
	}
}

func NewUnauthorized(url string, insecureSkipTLSVerify ...bool) *Client {
	insecure := len(insecureSkipTLSVerify) > 0 && insecureSkipTLSVerify[0]
	return &Client{
		Console: console.New(&http.Client{Transport: transport(insecure)}, url, nil),
		ctx:     context.Background(),
	}
}
