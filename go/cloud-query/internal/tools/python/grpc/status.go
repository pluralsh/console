package grpc

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python"
)

// StatusError translates a runner error into an RPC-safe gRPC status error.
func StatusError(err error) error {
	return status.Error(statusCode(python.CodeOf(err)), python.PublicMessage(err))
}

func statusCode(code python.Code) codes.Code {
	switch code {
	case python.InvalidArgument:
		return codes.InvalidArgument
	case python.FailedPrecondition:
		return codes.FailedPrecondition
	case python.Canceled:
		return codes.Canceled
	case python.DeadlineExceeded:
		return codes.DeadlineExceeded
	case python.ResourceExhausted:
		return codes.ResourceExhausted
	case python.Unavailable:
		return codes.Unavailable
	default:
		return codes.Internal
	}
}
