package errors

import (
	"errors"
	"net/http"
	"strings"

	client "github.com/Yamashou/gqlgenc/clientv2"
)

type KnownError string

func (k KnownError) String() string {
	return string(k)
}

func (k KnownError) Error() string {
	return string(k)
}

const (
	ErrNotFound         KnownError = "could not find resource"
	ErrUnauthenticated  KnownError = "unauthenticated"
	ErrExpected         KnownError = "this is a transient, expected error"
	ErrRetriable        KnownError = "Still waiting on read/write bindings, requeueing until they're available"
	ErrDeleteRepository            = "could not delete repository"
)

type wrappedErrorResponse struct {
	err *client.ErrorResponse
}

func (er *wrappedErrorResponse) Has(err KnownError) bool {
	if er.err.GqlErrors == nil {
		return false
	}

	for _, g := range *er.err.GqlErrors {
		if g.Message == string(err) {
			return true
		}
	}

	return false
}

func (er *wrappedErrorResponse) HasNetworkError(code int) bool {
	if er.err.NetworkError == nil {
		return false
	}

	return er.err.NetworkError.Code == code
}

func newAPIError(err *client.ErrorResponse) *wrappedErrorResponse {
	return &wrappedErrorResponse{
		err: err,
	}
}

func IsNotFound(err error) bool {
	if err == nil {
		return false
	}

	errorResponse := new(client.ErrorResponse)
	ok := errors.As(err, &errorResponse)
	if !ok {
		return false
	}

	return newAPIError(errorResponse).Has(ErrNotFound)
}

func IgnoreNotFound(err error) error {
	if IsNotFound(err) {
		return nil
	}

	return err
}

func IsDeleteRepository(err error) bool {
	if err == nil {
		return false
	}

	errorResponse := new(client.ErrorResponse)
	ok := errors.As(err, &errorResponse)
	if !ok {
		return false
	}

	return newAPIError(errorResponse).Has(ErrDeleteRepository)
}

func IsNetworkError(err error, code int) bool {
	if err == nil {
		return false
	}

	errorResponse := new(client.ErrorResponse)
	ok := errors.As(err, &errorResponse)
	if !ok {
		return false
	}

	return newAPIError(errorResponse).HasNetworkError(code)
}

func IsUnauthenticated(err error) bool {
	if err == nil {
		return false
	}

	errorResponse := new(client.ErrorResponse)
	ok := errors.As(err, &errorResponse)
	if !ok {
		return false
	}

	wrapped := newAPIError(errorResponse)
	if wrapped.HasNetworkError(http.StatusUnauthorized) || wrapped.HasNetworkError(http.StatusForbidden) {
		return true
	}

	if errorResponse.GqlErrors == nil {
		return false
	}

	for _, gqlErr := range *errorResponse.GqlErrors {
		if gqlErr != nil && strings.EqualFold(strings.TrimSpace(gqlErr.Message), string(ErrUnauthenticated)) {
			return true
		}
	}

	return false
}
