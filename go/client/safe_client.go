package client

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/Yamashou/gqlgenc/clientv2"
)

const (
	sanitizedResponseMessage            = "response body omitted"
	gqlgencTopLevelDecodePrefix         = "failed to decode data "
	gqlgencResponseDecodePrefix         = "failed to decode data into response "
	gqlgencMalformedGraphQLErrorsPrefix = "faild to parse graphql errors. Response content " // "faild" is from gqlgenc v0.33.0.
)

// New creates a ConsoleClient that does not expose GraphQL response bodies in errors.
func New(cli clientv2.HttpClient, baseURL string, options *clientv2.Options, interceptors ...clientv2.RequestInterceptor) ConsoleClient {
	safeInterceptors := make([]clientv2.RequestInterceptor, 0, len(interceptors)+1)
	safeInterceptors = append(safeInterceptors, interceptors...)
	safeInterceptors = append(safeInterceptors, NewErrorInterceptor())

	return NewClient(cli, baseURL, options, safeInterceptors...)
}

func NewErrorInterceptor() clientv2.RequestInterceptor {
	return (ErrorInterceptor{}).Interceptor
}

type ErrorInterceptor struct{}

func (in ErrorInterceptor) Interceptor(ctx context.Context, req *http.Request, gqlInfo *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
	err := next(ctx, req, gqlInfo, res)
	if err == nil {
		return err
	}

	sanitized := in.sanitize(err)
	if errors.Is(sanitized, err) {
		return err
	}

	return fmt.Errorf("console GraphQL operation %q failed: %w", in.toOperationName(gqlInfo), sanitized)
}

func (in ErrorInterceptor) sanitize(err error) error {
	var response *clientv2.ErrorResponse
	if errors.As(err, &response) && response != nil && response.NetworkError != nil {
		return in.toSanitizedError(response)
	}

	if !in.isKnownError(err) {
		return err
	}

	if cause := errors.Unwrap(err); cause != nil {
		return cause
	}

	return errors.New("GraphQL response decode failed")
}

func (ErrorInterceptor) toSanitizedError(response *clientv2.ErrorResponse) error {
	return &clientv2.ErrorResponse{
		GqlErrors: response.GqlErrors,
		NetworkError: &clientv2.HTTPError{
			Code:    response.NetworkError.Code,
			Message: sanitizedResponseMessage,
		},
	}
}

func (ErrorInterceptor) isKnownError(err error) bool {
	message := err.Error()
	return strings.HasPrefix(message, gqlgencTopLevelDecodePrefix) ||
		strings.HasPrefix(message, gqlgencResponseDecodePrefix) ||
		strings.HasPrefix(message, gqlgencMalformedGraphQLErrorsPrefix)
}

func (ErrorInterceptor) toOperationName(gqlInfo *clientv2.GQLRequestInfo) string {
	if gqlInfo == nil || gqlInfo.Request == nil || gqlInfo.Request.OperationName == "" {
		return "unknown"
	}

	return gqlInfo.Request.OperationName
}
