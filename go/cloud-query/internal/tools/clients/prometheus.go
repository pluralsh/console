package clients

import (
	"net/http"

	"github.com/prometheus/client_golang/api"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type prometheusAuthRoundTripper struct {
	base     http.RoundTripper
	token    string
	username string
	password string
}

func (rt *prometheusAuthRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if rt.base == nil {
		rt.base = api.DefaultRoundTripper
	}

	if len(req.Header.Get("Authorization")) != 0 {
		return rt.base.RoundTrip(req)
	}

	if len(rt.token) > 0 {
		req.Header.Set("Authorization", "Bearer "+rt.token)
		return rt.base.RoundTrip(req)
	}

	if len(rt.username) > 0 && len(rt.password) > 0 {
		req.SetBasicAuth(rt.username, rt.password)
	}

	return rt.base.RoundTrip(req)
}

func NewPrometheusHTTPClient(conn *toolquery.PrometheusConnection) *http.Client {
	if conn == nil {
		return &http.Client{Transport: api.DefaultRoundTripper}
	}

	return &http.Client{
		Transport: &prometheusAuthRoundTripper{
			base:     api.DefaultRoundTripper,
			token:    conn.GetToken(),
			username: conn.GetUsername(),
			password: conn.GetPassword(),
		},
	}
}
