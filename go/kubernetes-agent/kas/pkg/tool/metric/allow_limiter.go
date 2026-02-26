package metric

import (
	"context"

	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var (
	_ AllowLimiter = (*AllowLimiterInstrumentation)(nil)
)

type AllowLimiter interface {
	Allow(context.Context) bool
}

type AllowLimiterInstrumentation struct {
	wrapper  *LimiterWrapper
	delegate AllowLimiter
}

func NewAllowLimiterInstrumentation(limiterName string, limit float64, limitUnit string, tr trace.Tracer, m otelmetric.Meter, delegate AllowLimiter) (*AllowLimiterInstrumentation, error) {
	w, err := NewLimiterWrapper(limiterName, limit, limitUnit, m, tr)
	if err != nil {
		return nil, err
	}
	return &AllowLimiterInstrumentation{
		wrapper:  w,
		delegate: delegate,
	}, nil
}

func (i *AllowLimiterInstrumentation) Allow(ctx context.Context) (allowed bool) {
	ctx, done := i.wrapper.Start(ctx)
	defer func() { // to handle panics
		done(allowed)
	}()
	return i.delegate.Allow(ctx)
}
