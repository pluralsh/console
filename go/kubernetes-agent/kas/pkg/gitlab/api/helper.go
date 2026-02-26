package api

import (
	"errors"
	"net/http"

	gitlab2 "github.com/pluralsh/kubernetes-agent/pkg/gitlab"
)

// IsCacheableError checks if an error is cacheable.
func IsCacheableError(err error) bool {
	var e *gitlab2.ClientError
	if !errors.As(err, &e) {
		return false // not a client error, probably a network error
	}
	switch e.StatusCode {
	case http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound:
		return true
	default:
		return false
	}
}

func joinOpts(extra []gitlab2.DoOption, opts ...gitlab2.DoOption) []gitlab2.DoOption {
	if len(extra) == 0 {
		return opts
	}
	if len(opts) == 0 {
		return extra
	}
	res := make([]gitlab2.DoOption, 0, len(extra)+len(opts))
	res = append(res, opts...)
	res = append(res, extra...)
	return res
}
