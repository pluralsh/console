package errors

import (
	"errors"
	"strings"

	client "github.com/Yamashou/gqlgenc/clientv2"
	"github.com/samber/lo"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

type KnownError string

func (k KnownError) String() string {
	return string(k)
}

func (k KnownError) Error() string {
	return string(k)
}

const (
	ErrNotFound             KnownError = "could not find resource"
	ErrNotFoundAlt          KnownError = "not found"
	ErrNotFoundOIDCProvider KnownError = "the resource you requested was not found"
	ErrDeleteRepository                = "could not delete repository"
)

func NewNotFound() error {
	return &client.ErrorResponse{GqlErrors: lo.ToPtr(gqlerror.List{{Message: ErrNotFound.String()}})}
}

type wrappedErrorResponse struct {
	err *client.ErrorResponse
}

func (er *wrappedErrorResponse) Has(err KnownError) bool {
	if er.err.GqlErrors == nil {
		return false
	}

	expected := string(err)
	for _, g := range *er.err.GqlErrors {
		if strings.Contains(g.Message, expected) {
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

	return (newAPIError(errorResponse).Has(ErrNotFound) ||
		newAPIError(errorResponse).Has(ErrNotFoundOIDCProvider) ||
		newAPIError(errorResponse).Has(ErrNotFoundAlt))
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
