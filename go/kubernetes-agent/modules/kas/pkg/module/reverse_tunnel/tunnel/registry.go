package tunnel

import (
	"context"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel/attribute"
	otelcodes "go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/syncz"
)

const (
	stopTimeout = 5 * time.Second
	stripeBits  = 8

	traceTunnelFoundAttr    attribute.Key = "found"
	traceStoppedTunnelsAttr attribute.Key = "stoppedTunnels"
	traceAbortedFTRAttr     attribute.Key = "abortedFTR"
)

type Handler interface {
	// HandleTunnel is called with server-side interface of the reverse tunnel.
	// It registers the tunnel and blocks, waiting for a request to proxy through the tunnel.
	// The method returns the error value to return to gRPC framework.
	// ageCtx can be used to unblock the method if the tunnel is not being used already.
	HandleTunnel(ageCtx context.Context, agentInfo *api.AgentInfo, server rpc2.ReverseTunnel_ConnectServer) error
}

type FindHandle interface {
	// Get finds a tunnel to an agentk.
	// It waits for a matching tunnel to proxy a connection through. When a matching tunnel is found, it is returned.
	// It returns gRPC status errors only, ready to return from RPC handler.
	Get(ctx context.Context) (Tunnel, error)
	// Done must be called to free resources of this FindHandle instance.
	// ctx is used for tracing only.
	Done(ctx context.Context)
}

type Finder interface {
	// FindTunnel starts searching for a tunnel to a matching agentk.
	// Found tunnel is:
	// - to an agent with provided id.
	// - supports handling provided gRPC service and method.
	// Tunnel found boolean indicates whether a suitable tunnel is immediately available from the
	// returned FindHandle object.
	FindTunnel(ctx context.Context, agentId int64, service, method string) (bool, FindHandle)
}

type Registry struct {
	log           *zap.Logger
	api           modshared.Api
	tracer        trace.Tracer
	refreshPeriod time.Duration
	stripes       syncz.StripedValue[registryStripe]
}

func NewRegistry(log *zap.Logger, api modshared.Api, tracer trace.Tracer, refreshPeriod, ttl time.Duration,
	tunnelTracker Tracker) (*Registry, error) {
	tunnelStreamVisitor, err := grpctool.NewStreamVisitor(&rpc2.ConnectRequest{})
	if err != nil {
		return nil, err
	}
	return &Registry{
		log:           log,
		api:           api,
		tracer:        tracer,
		refreshPeriod: refreshPeriod,
		stripes: syncz.NewStripedValueInit(stripeBits, func() registryStripe {
			return registryStripe{
				log:                   log,
				api:                   api,
				tracer:                tracer,
				tunnelStreamVisitor:   tunnelStreamVisitor,
				tunnelTracker:         tunnelTracker,
				ttl:                   ttl,
				tunsByAgentId:         make(map[int64]agentId2tunInfo),
				findRequestsByAgentId: make(map[int64]map[*findTunnelRequest]struct{}),
			}
		}),
	}, nil
}

func (r *Registry) FindTunnel(ctx context.Context, agentId int64, service, method string) (bool, FindHandle) {
	// Use GetPointer() to avoid copying the embedded mutex.
	return r.stripes.GetPointer(agentId).FindTunnel(ctx, agentId, service, method)
}

func (r *Registry) HandleTunnel(ageCtx context.Context, agentInfo *api.AgentInfo, server rpc2.ReverseTunnel_ConnectServer) error {
	// Use GetPointer() to avoid copying the embedded mutex.
	return r.stripes.GetPointer(agentInfo.Id).HandleTunnel(ageCtx, agentInfo, server)
}

func (r *Registry) KasUrlsByAgentId(ctx context.Context, agentId int64) ([]string, error) {
	ctx, span := r.tracer.Start(ctx, "Registry.KasUrlsByAgentId", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	// Use GetPointer() to avoid copying the embedded mutex.
	return r.stripes.GetPointer(agentId).tunnelTracker.KasUrlsByAgentId(ctx, agentId)
}

func (r *Registry) Run(ctx context.Context) error {
	defer r.stopInternal(ctx) // nolint: contextcheck
	refreshTicker := time.NewTicker(r.refreshPeriod)
	defer refreshTicker.Stop()
	done := ctx.Done()
	for {
		select {
		case <-done:
			return nil
		case <-refreshTicker.C:
			r.refreshRegistrations(ctx)
		}
	}
}

// stopInternal aborts any open tunnels.
// It should not be necessary to abort tunnels when registry is used correctly i.e. this method is called after
// all tunnels have terminated gracefully.
func (r *Registry) stopInternal(ctx context.Context) (int /*stoppedTun*/, int /*abortedFtr*/) {
	ctx = contextWithoutCancel(ctx)
	ctx, cancel := context.WithTimeout(ctx, stopTimeout)
	defer cancel()
	ctx, span := r.tracer.Start(ctx, "Registry.stopInternal", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	var wg wait.Group
	var stoppedTun, abortedFtr atomic.Int32

	for s := range r.stripes.Stripes { // use index var to avoid copying embedded mutex
		wg.Start(func() {
			stopCtx, stopSpan := r.tracer.Start(ctx, "registryStripe.Stop", trace.WithSpanKind(trace.SpanKindInternal))
			defer stopSpan.End()

			st, aftr := r.stripes.Stripes[s].Stop(stopCtx)
			stoppedTun.Add(int32(st))
			abortedFtr.Add(int32(aftr))
			stopSpan.SetAttributes(traceStoppedTunnelsAttr.Int(st), traceAbortedFTRAttr.Int(aftr))
		})
	}
	wg.Wait()

	v1 := int(stoppedTun.Load())
	v2 := int(abortedFtr.Load())
	span.SetAttributes(traceStoppedTunnelsAttr.Int(v1), traceAbortedFTRAttr.Int(v2))
	return v1, v2
}

func (r *Registry) refreshRegistrations(ctx context.Context) {
	ctx, span := r.tracer.Start(ctx, "Registry.refreshRegistrations", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	for s := range r.stripes.Stripes { // use index var to avoid copying embedded mutex
		func() {
			refreshCtx, refreshSpan := r.tracer.Start(ctx, "registryStripe.Refresh", trace.WithSpanKind(trace.SpanKindInternal))
			defer refreshSpan.End()

			err := r.stripes.Stripes[s].Refresh(refreshCtx)
			if err != nil {
				r.api.HandleProcessingError(refreshCtx, r.log, modshared.NoAgentId, "Failed to refresh data", err)
				refreshSpan.SetStatus(otelcodes.Error, "Failed to refresh data")
				refreshSpan.RecordError(err)
				// fallthrough
			} else {
				refreshSpan.SetStatus(otelcodes.Ok, "")
			}
		}()
	}
}
