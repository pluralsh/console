package metric

import (
	"context"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

const (
	rateLimiterBlockDurationName               = "limiter_block_duration"
	rateLimiterLimitName                       = "limiter_limit"
	allowedAttr                  attribute.Key = "allowed"
	limiterNameAttr              attribute.Key = "limiter_name"
	limiterLimitUnitAttr         attribute.Key = "unit"
)

type LimiterWrapper struct {
	limiterName string
	tr          trace.Tracer
	hist        otelmetric.Float64Histogram
}

func NewLimiterWrapper(limiterName string, limit float64, limitUnit string, m otelmetric.Meter, tr trace.Tracer) (*LimiterWrapper, error) {
	limitAttrs := otelmetric.WithAttributeSet(attribute.NewSet(
		limiterNameAttr.String(limiterName),
		limiterLimitUnitAttr.String(limitUnit),
	)) // allocate once
	_, err := m.Float64ObservableGauge(
		rateLimiterLimitName,
		otelmetric.WithDescription("Limit for the rate limiter"),
		otelmetric.WithUnit(limitUnit),
		otelmetric.WithFloat64Callback(func(ctx context.Context, observer otelmetric.Float64Observer) error {
			observer.Observe(limit, limitAttrs)
			return nil
		}),
	)
	if err != nil {
		return nil, err
	}
	hist, err := m.Float64Histogram(
		rateLimiterBlockDurationName,
		// TODO switch to "seconds" once API to set histogram's buckets is available
		// See https://github.com/open-telemetry/opentelemetry-go/issues/4094
		otelmetric.WithUnit("ms"),
		otelmetric.WithDescription("Duration the rate limiter blocked for deciding to allow/block the call"),
	)
	if err != nil {
		return nil, err
	}
	return &LimiterWrapper{
		limiterName: limiterName,
		tr:          tr,
		hist:        hist,
	}, nil
}

func (w *LimiterWrapper) Start(ctx context.Context) (context.Context, func(allowed bool)) {
	start := time.Now()
	ctx, span := w.tr.Start(ctx, "limiter", trace.WithSpanKind(trace.SpanKindInternal))
	return ctx, func(allowed bool) {
		// TODO switch to "seconds" once API to set histogram's buckets is available
		// See https://github.com/open-telemetry/opentelemetry-go/issues/4094
		duration := float64(time.Since(start)) / float64(time.Millisecond)
		// Pass background context because we always want to record the duration.
		w.hist.Record(context.Background(), duration, otelmetric.WithAttributeSet(attribute.NewSet(
			allowedAttr.Bool(allowed),
			limiterNameAttr.String(w.limiterName),
		)))
		if allowed {
			span.SetStatus(codes.Ok, "")
		} else {
			span.SetStatus(codes.Error, "")
		}
		span.End()
	}
}
