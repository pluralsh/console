package core

import (
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// statusError returns a gRPC status carrying an ErrorDetail, the form console maps to user-facing reasons.
func statusError(code codes.Code, reason devboxv1.ErrorReason, format string, args ...any) error {
	msg := fmt.Sprintf(format, args...)
	st := status.New(code, msg)
	if withDetail, err := st.WithDetails(&devboxv1.ErrorDetail{Reason: reason, Message: msg}); err == nil {
		return withDetail.Err()
	}
	return st.Err()
}

func errNotFound(id string) error {
	return statusError(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_INSTANCE_NOT_FOUND, "instance %s is not known to this gateway", id)
}

func errSuspended(id string) error {
	return statusError(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_INSTANCE_SUSPENDED, "instance %s is suspended", id)
}

func errRecord(err error) error {
	return status.Errorf(codes.Unavailable, "persisting the instance record: %v", err)
}

// detailOf extracts an ErrorDetail for status reports.
func detailOf(err error, reason devboxv1.ErrorReason) *devboxv1.ErrorDetail {
	if err == nil {
		return nil
	}
	for _, d := range status.Convert(err).Details() {
		if ed, ok := d.(*devboxv1.ErrorDetail); ok {
			return ed
		}
	}
	return &devboxv1.ErrorDetail{Reason: reason, Message: err.Error()}
}
