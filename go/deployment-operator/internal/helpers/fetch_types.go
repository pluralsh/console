package helpers

import (
	"net/http"
	"time"
)

const (
	defaultFetchTmpDirPattern = "fetch"
	defaultFetchTimeout       = time.Minute
)

type FetchOption func(*fetchClient)

type FetchClient interface {
	Tarball(url string) (string, error)
}

type fetchClient struct {
	// destination is a path to directory where data should be stored
	destination string
	// client
	client *http.Client
	// timeout
	timeout *time.Duration
	// transport
	transport http.RoundTripper
}
