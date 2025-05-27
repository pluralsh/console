package client

import (
	"context"
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

type client struct {
	ctx           context.Context
	url           string
	consoleClient console.ConsoleClient
}

type ConsoleClient interface {
}

func New(url, token string) ConsoleClient {
	return &client{
		consoleClient: console.NewClient(NewHttpClient(token), url, nil),
		url:           url,
		ctx:           context.Background(),
	}
}

func NewHttpClient(token string) *http.Client {
	return &http.Client{Transport: &authedTransport{token: token, wrapped: http.DefaultTransport}}
}
