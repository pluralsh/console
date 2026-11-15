// Package derr builds gRPC errors carrying a devbox.v1.ErrorDetail, so callers can branch on the reason.
package derr

import (
	"errors"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// New returns a status error with an ErrorDetail.
func New(code codes.Code, reason devboxv1.ErrorReason, msg string, md map[string]string) error {
	st := status.New(code, msg)
	if withDetail, err := st.WithDetails(&devboxv1.ErrorDetail{Reason: reason, Message: msg, Metadata: md}); err == nil {
		st = withDetail
	}
	return st.Err()
}

// Unsupported is the typed UNSUPPORTED error for a thread action the agent doesn't advertise.
func Unsupported(action string) error {
	return New(codes.Unimplemented, devboxv1.ErrorReason_ERROR_REASON_UNSUPPORTED,
		fmt.Sprintf("the agent does not support %s", action), map[string]string{"action": action})
}

// ThreadNotFound is the typed THREAD_NOT_FOUND error.
func ThreadNotFound(id string) error {
	return New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_THREAD_NOT_FOUND, fmt.Sprintf("thread %q not found", id), nil)
}

// InvalidAgentOrModel is the typed INVALID_AGENT_OR_MODEL error.
func InvalidAgentOrModel(msg string) error {
	return New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_INVALID_AGENT_OR_MODEL, msg, nil)
}

// FileConflict is the typed FILE_CONFLICT error for a failed compare-and-swap write.
func FileConflict(path string) error {
	return New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_FILE_CONFLICT,
		fmt.Sprintf("%s changed since it was read", path), map[string]string{"path": path})
}

// Reason extracts the ErrorDetail reason from an error, or UNSPECIFIED.
func Reason(err error) devboxv1.ErrorReason {
	st, ok := status.FromError(err)
	if !ok {
		return devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED
	}
	for _, d := range st.Details() {
		if ed, ok := d.(*devboxv1.ErrorDetail); ok {
			return ed.GetReason()
		}
	}
	return devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED
}

// Code returns the gRPC code of err (Unknown for non-status errors).
func Code(err error) codes.Code {
	var se interface{ GRPCStatus() *status.Status }
	if errors.As(err, &se) {
		return se.GRPCStatus().Code()
	}
	return status.Code(err)
}
