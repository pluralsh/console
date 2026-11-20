package plural

import (
	"errors"
	"fmt"
	"testing"

	"github.com/gqlgo/gqlgenc/clientv2"
	"github.com/stretchr/testify/assert"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestVerifyClusterError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want codes.Code
	}{
		{name: "graphql error", err: &clientv2.ErrorResponse{GqlErrors: &gqlerror.List{{Message: "forbidden"}}}, want: codes.Unauthenticated},
		{name: "401", err: &clientv2.ErrorResponse{NetworkError: &clientv2.HTTPError{Code: 401}}, want: codes.Unauthenticated},
		{name: "403 wrapped", err: fmt.Errorf("x: %w", &clientv2.ErrorResponse{NetworkError: &clientv2.HTTPError{Code: 403}}), want: codes.Unauthenticated},
		{name: "502", err: &clientv2.ErrorResponse{NetworkError: &clientv2.HTTPError{Code: 502}}, want: codes.Unavailable},
		{name: "429", err: &clientv2.ErrorResponse{NetworkError: &clientv2.HTTPError{Code: 429}}, want: codes.Unavailable},
		{name: "transport", err: errors.New("dial tcp: connection refused"), want: codes.Unavailable},
		{name: "status passthrough", err: status.Error(codes.PermissionDenied, "x"), want: codes.PermissionDenied},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, status.Code(VerifyClusterError(tc.err)))
		})
	}
	assert.NoError(t, VerifyClusterError(nil))
}
