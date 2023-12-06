package errors

import (
	"errors"
	"github.com/Yamashou/gqlgenc/client"
)

var ErrExpected = errors.New("this is a transient, expected error")

type KnownError string

const (
	ErrorNotFound KnownError = "could not find resource"
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

	return newAPIError(errorResponse).Has(ErrorNotFound)
}
