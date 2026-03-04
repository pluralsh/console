package plural

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

type Client struct {
	ctx     context.Context
	Console console.ConsoleClient
}

func New(url, token string) *Client {
	httpClient := http.Client{
		Transport: &authedTransport{
			token:   token,
			wrapped: http.DefaultTransport,
		},
	}

	return &Client{
		Console: console.NewClient(&httpClient, url, nil),
		ctx:     context.Background(),
	}
}

func NewUnauthorized(url string) *Client {
	return &Client{
		Console: console.NewClient(http.DefaultClient, url, nil),
		ctx:     context.Background(),
	}
}
