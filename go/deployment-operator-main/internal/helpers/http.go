package helpers

import (
	"net/http"
)

type AuthorizationTokenTransport struct {
	token     string
	transport http.RoundTripper
}

func (in *AuthorizationTokenTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("Authorization", "Token "+in.token)
	return in.transport.RoundTrip(req)
}

func NewAuthorizationTokenTransport(token string) http.RoundTripper {
	return &AuthorizationTokenTransport{token: token, transport: http.DefaultTransport}
}

type AuthorizationBearerTransport struct {
	token     string
	transport http.RoundTripper
}

func (in *AuthorizationBearerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("Authorization", "Bearer "+in.token)
	return in.transport.RoundTrip(req)
}

func NewAuthorizationBearerTransport(token string) http.RoundTripper {
	return &AuthorizationBearerTransport{token: token, transport: http.DefaultTransport}
}
