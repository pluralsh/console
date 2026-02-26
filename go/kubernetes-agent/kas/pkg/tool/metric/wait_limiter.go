package metric

import (
	"context"

	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var (
	_ WaitLimiter = (*WaitLimiterInstrumentation)(nil)
)

type WaitLimiter interface {
	Wait(context.Context) error
}

type WaitLimiterInstrumentation struct {
	wrapper  *LimiterWrapper
	delegate WaitLimiter
}

func NewWaitLimiterInstrumentation(limiterName string, limit float64, limitUnit string, tr trace.Tracer, m otelmetric.Meter, delegate WaitLimiter) (*WaitLimiterInstrumentation, error) {
	w, err := NewLimiterWrapper(limiterName, limit, limitUnit, m, tr)
	if err != nil {
		return nil, err
	}
	return &WaitLimiterInstrumentation{
		wrapper:  w,
		delegate: delegate,
	}, nil
}

func (i *WaitLimiterInstrumentation) Wait(ctx context.Context) error {
	ctx, done := i.wrapper.Start(ctx)
	allowed := false
	defer func() { // to handle panics
		done(allowed)
	}()
	err := i.delegate.Wait(ctx)
	allowed = err == nil
	return err
}
