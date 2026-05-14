package metrics

import (
	"time"
)

func WithServiceReconciliationError(err error) ServiceReconciliationOption {
	return func(o *serviceReconciliationOptions) {
		o.err = err
	}
}

func WithServiceReconciliationStartedAt(startedAt time.Time) ServiceReconciliationOption {
	return func(o *serviceReconciliationOptions) {
		o.startedAt = &startedAt
	}
}

func WithServiceReconciliationStage(stage ServiceReconciliationStage) ServiceReconciliationOption {
	return func(o *serviceReconciliationOptions) {
		o.stage = &stage
	}
}
