package plural

import (
	"errors"
	"net/http"

	"github.com/gqlgo/gqlgenc/clientv2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// VerifyClusterError turns an error from GetAgentInfo into a gRPC status error. Console rejecting the deploy
// token (a GraphQL error, 401 or 403) becomes Unauthenticated; anything else, such as console being unreachable,
// becomes Unavailable so callers can retry.
func VerifyClusterError(err error) error {
	if err == nil {
		return nil
	}
	if s, ok := status.FromError(err); ok {
		return s.Err()
	}
	var errResp *clientv2.ErrorResponse
	if errors.As(err, &errResp) {
		if ne := errResp.NetworkError; ne != nil {
			switch {
			case ne.Code == http.StatusUnauthorized || ne.Code == http.StatusForbidden:
				return status.Error(codes.Unauthenticated, "cluster deploy token was rejected")
			case ne.Code == http.StatusTooManyRequests || ne.Code >= http.StatusInternalServerError:
				return status.Errorf(codes.Unavailable, "console is unavailable: HTTP %d", ne.Code)
			default:
				return status.Errorf(codes.Unauthenticated, "cluster deploy token could not be verified: HTTP %d", ne.Code)
			}
		}
		if errResp.GqlErrors != nil {
			return status.Error(codes.Unauthenticated, "cluster deploy token was rejected")
		}
	}
	return status.Errorf(codes.Unavailable, "console is unavailable: %v", err)
}
