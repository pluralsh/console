package common

import (
	"errors"
	"net"
	"net/http"

	"github.com/pluralsh/console/go/deployment-operator/pkg/manifests"
)

func IsRateLimitError(err error) bool {
	var httpErr *manifests.HTTPError
	return errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusTooManyRequests
}

func IsTimeoutError(err error) bool {
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}

func IsTransientFetchError(err error) bool {
	return IsRateLimitError(err) || IsTimeoutError(err)
}
