package tunnel

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	otelcodes "go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

const (
	unregistrationDelay = 5 * time.Second
)

type findTunnelRequest struct {
	agentId         int64
	service, method string
	retTun          chan<- *tunnelImpl
}

type findHandle struct {
	tracer    trace.Tracer
	retTun    <-chan *tunnelImpl
	done      func(context.Context)
	gotTunnel bool
}

func (h *findHandle) Get(ctx context.Context) (Tunnel, error) {
	ctx, span := h.tracer.Start(ctx, "findHandle.Get", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	select {
	case <-ctx.Done():
		span.SetStatus(otelcodes.Error, "FindTunnel request aborted")
		span.RecordError(ctx.Err())
		return nil, grpctool2.StatusErrorFromContext(ctx, "FindTunnel request aborted")
	case tun := <-h.retTun:
		h.gotTunnel = true
		if tun == nil {
			span.SetStatus(otelcodes.Error, "kas is shutting down")
			return nil, status.Error(codes.Unavailable, "kas is shutting down")
		}
		span.SetStatus(otelcodes.Ok, "")
		return tun, nil
	}
}

func (h *findHandle) Done(ctx context.Context) {
	ctx, span := h.tracer.Start(ctx, "findHandle.Done", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	if h.gotTunnel {
		// No cleanup needed if Get returned a tunnel.
		return
	}
	h.done(ctx)
}

type agentId2tunInfo struct {
	tuns      map[*tunnelImpl]struct{}
	waitForIO chan struct{}
	// stopIO can be called to stop a pending (un)registration if it hasn't started yet
	stopIO        func() bool
	missedRefresh bool
}

type registryStripe struct {
	log                 *zap.Logger
	api                 modshared.Api
	tracer              trace.Tracer
	tunnelStreamVisitor *grpctool2.StreamVisitor
	tunnelTracker       Tracker
	ttl                 time.Duration

	mu                    sync.Mutex
	tunsByAgentId         map[int64]agentId2tunInfo
	findRequestsByAgentId map[int64]map[*findTunnelRequest]struct{}
}

func (r *registryStripe) Refresh(ctx context.Context) error {
	var refresh []int64
	waitForIO := make(chan struct{})
	defer close(waitForIO)
	func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		refresh = make([]int64, 0, len(r.tunsByAgentId))
		for agentId, info := range r.tunsByAgentId {
			if len(info.tuns) == 0 {
				select {
				case <-info.waitForIO:
					// Unregistration IO has completed already.
					// Remove from map.
					delete(r.tunsByAgentId, agentId)
				default:
					// Unregistration IO has not run yet or is running but has not completed yet.
					// Mark it as missed refresh.
					info.missedRefresh = true
					r.tunsByAgentId[agentId] = info // save mutated field
				}
				continue // do not refresh this id
			}
			refresh = append(refresh, agentId)
			info.waitForIO = waitForIO
			info.stopIO = unstoppableIO
			r.tunsByAgentId[agentId] = info
		}
	}()
	return r.tunnelTracker.Refresh(ctx, r.ttl, refresh...)
}

func (r *registryStripe) FindTunnel(ctx context.Context, agentId int64, service, method string) (bool, FindHandle) {
	ctx, span := r.tracer.Start(ctx, "registryStripe.FindTunnel", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	// Buffer 1 to not block on send when a tunnel is found before find request is registered.
	retTun := make(chan *tunnelImpl, 1) // can receive nil from it if Stop() is called
	ftr := &findTunnelRequest{
		agentId: agentId,
		service: service,
		method:  method,
		retTun:  retTun,
	}
	found := false
	func() {
		r.mu.Lock()
		defer r.mu.Unlock()

		// 1. Check if we have a suitable tunnel
		for tun := range r.tunsByAgentId[agentId].tuns {
			if !tun.agentDescriptor.SupportsServiceAndMethod(service, method) {
				continue
			}
			// Suitable tunnel found!
			tun.state = stateFound
			retTun <- tun // must not block because the reception is below
			found = true
			r.unregisterTunnelLocked(ctx, tun)
			return
		}
		// 2. No suitable tunnel found, add to the queue
		findRequestsForAgentId := r.findRequestsByAgentId[agentId]
		if findRequestsForAgentId == nil {
			findRequestsForAgentId = make(map[*findTunnelRequest]struct{}, 1)
			r.findRequestsByAgentId[agentId] = findRequestsForAgentId
		}
		findRequestsForAgentId[ftr] = struct{}{}
	}()
	span.SetAttributes(traceTunnelFoundAttr.Bool(found))
	return found, &findHandle{
		tracer: r.tracer,
		retTun: retTun,
		done: func(ctx context.Context) {
			r.mu.Lock()
			defer r.mu.Unlock()
			close(retTun)
			tun := <-retTun // will get nil if there was nothing in the channel or if registry is shutting down.
			if tun != nil {
				// Got the tunnel, but it's too late so return it to the registry.
				r.onTunnelDoneLocked(ctx, tun)
			} else {
				r.deleteFindRequestLocked(ftr)
			}
		},
	}
}

func (r *registryStripe) HandleTunnel(ageCtx context.Context, agentInfo *api.AgentInfo, server rpc2.ReverseTunnel_ConnectServer) error {
	ctx := server.Context()
	ctx, span := r.tracer.Start(ctx, "registryStripe.HandleTunnel", trace.WithSpanKind(trace.SpanKindServer))
	defer span.End() // we don't add the returned error to the span as it's added by the gRPC OTEL stats handler already.

	recv, err := server.Recv()
	if err != nil {
		return err
	}
	descriptor, ok := recv.Msg.(*rpc2.ConnectRequest_Descriptor_)
	if !ok {
		return status.Errorf(codes.InvalidArgument, "Invalid oneof value type: %T", recv.Msg)
	}
	retErr := make(chan error, 1)
	agentId := agentInfo.Id
	tun := &tunnelImpl{
		tunnel:              server,
		tunnelStreamVisitor: r.tunnelStreamVisitor,
		tunnelRetErr:        retErr,
		agentId:             agentId,
		agentDescriptor:     descriptor.Descriptor_.AgentDescriptor,
		state:               stateReady,
		onForward:           r.onTunnelForward,
		onDone:              r.onTunnelDone,
	}
	// Register
	r.registerTunnel(ctx, tun) // nolint: contextcheck
	// Wait for return error or for cancellation
	select {
	case <-ageCtx.Done():
		// Context canceled
		r.mu.Lock()
		switch tun.state {
		case stateReady:
			tun.state = stateContextDone
			r.unregisterTunnelLocked(ctx, tun) // nolint: contextcheck
			r.mu.Unlock()
			return nil
		case stateFound:
			// Tunnel was found but hasn't been used yet, Done() hasn't been called.
			// Set state to stateContextDone so that ForwardStream() errors out without doing any I/O.
			tun.state = stateContextDone
			r.mu.Unlock()
			return nil
		case stateForwarding:
			// I/O on the stream will error out, just wait for the return value.
			r.mu.Unlock()
			return <-retErr
		case stateDone:
			// Forwarding has finished and then ctx signaled done. Return the result value from forwarding.
			r.mu.Unlock()
			return <-retErr
		case stateContextDone:
			// Cannot happen twice.
			r.mu.Unlock()
			panic(errors.New("unreachable"))
		default:
			// Should never happen
			r.mu.Unlock()
			panic(fmt.Errorf("invalid state: %d", tun.state))
		}
	case err = <-retErr:
		return err
	}
}

func (r *registryStripe) registerTunnel(ctx context.Context, toReg *tunnelImpl) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.registerTunnelLocked(ctx, toReg)
}

func (r *registryStripe) registerTunnelLocked(ctx context.Context, toReg *tunnelImpl) {
	agentId := toReg.agentId
	// 1. Before registering the tunnel see if there is a find tunnel request waiting for it
	findRequestsForAgentId := r.findRequestsByAgentId[agentId]
	for ftr := range findRequestsForAgentId {
		if !toReg.agentDescriptor.SupportsServiceAndMethod(ftr.service, ftr.method) {
			continue
		}
		// Waiting request found!
		toReg.state = stateFound
		ftr.retTun <- toReg            // Satisfy the waiting request ASAP
		r.deleteFindRequestLocked(ftr) // Remove it from the queue
		return
	}

	// 2. Register the tunnel
	shouldRegister := false
	toReg.state = stateReady
	info, ok := r.tunsByAgentId[agentId]
	if ok {
		if len(info.tuns) == 0 { // no tunnels
			if info.stopIO() { // Try to stop unregistration
				// Succeeded, close the channel to signal any waiters that I/O "has been done".
				close(info.waitForIO)
				shouldRegister = info.missedRefresh // register if it missed refresh to ensure it's not GCed
			} else {
				_, span := r.tracer.Start(ctx, "registryStripe.registerTunnelLocked(wait for io)", trace.WithSpanKind(trace.SpanKindInternal))
				<-info.waitForIO // Failed, wait for it to finish.
				span.End()
				shouldRegister = true
			}
		}
	} else {
		shouldRegister = true
		info = agentId2tunInfo{
			tuns: make(map[*tunnelImpl]struct{}),
		}
	}
	info.tuns[toReg] = struct{}{}
	if shouldRegister {
		// First tunnel for this agentId. Register it asynchronously.
		register, waitForIO := r.registerTunnelIO()
		info.waitForIO = waitForIO
		info.stopIO = unstoppableIO
		info.missedRefresh = false
		r.tunsByAgentId[agentId] = info
		go register(ctx, agentId)
	}
}

func (r *registryStripe) registerTunnelIO() (func(ctx context.Context, agentId int64), chan struct{}) {
	waitForIO := make(chan struct{})
	return func(ctx context.Context, agentId int64) {
		// Don't pass the original context to always register
		err := r.tunnelTracker.RegisterTunnel(contextWithoutCancel(ctx), r.ttl, agentId)
		close(waitForIO) // ASAP
		if err != nil {
			r.api.HandleProcessingError(ctx, r.log.With(logz.AgentId(agentId)), agentId, "Failed to register tunnel", err) // nolint:contextcheck
		}
	}, waitForIO
}

func (r *registryStripe) unregisterTunnelLocked(ctx context.Context, toUnreg *tunnelImpl) {
	agentId := toUnreg.agentId
	info := r.tunsByAgentId[agentId]
	delete(info.tuns, toUnreg)
	if len(info.tuns) == 0 {
		// Last tunnel for this agentId had been used. However, don't unregister it immediately. Agentk will
		// almost certainly establish more connections to compensate for the lack of available ones. If we
		// unregister it now, we'll have to re-register it in a moment again, causing useless I/O and delays.
		// To avoid the issue we schedule unregistration to happen in 1s. If a new tunnel is established before,
		// it will cancel unregistration, and we'd avoid this I/O.
		_, span := r.tracer.Start(ctx, "registryStripe.unregisterTunnelLocked(wait for io)", trace.WithSpanKind(trace.SpanKindInternal))
		<-info.waitForIO // wait for the current I/O (if any) to finish. May be in-flight registration I/O.
		span.End()
		unregister, waitForIO := r.unregisterTunnelIO(ctx, agentId)
		info.waitForIO = waitForIO
		info.stopIO = time.AfterFunc(unregistrationDelay, unregister).Stop
		r.tunsByAgentId[agentId] = info // not a pointer, so put back into map to preserve modifications
	}
}

func (r *registryStripe) unregisterTunnelIO(ctx context.Context, agentId int64) (func(), chan struct{}) {
	waitForIO := make(chan struct{})
	return func() {
		// Don't pass the original context to always unregister
		err := r.tunnelTracker.UnregisterTunnel(contextWithoutCancel(ctx), agentId)
		close(waitForIO) // ASAP
		if err != nil {
			r.api.HandleProcessingError(ctx, r.log.With(logz.AgentId(agentId)), agentId, "Failed to unregister tunnel", err) // nolint:contextcheck
		}
	}, waitForIO
}

func (r *registryStripe) onTunnelForward(tun *tunnelImpl) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	switch tun.state {
	case stateReady:
		return status.Error(codes.Internal, "unreachable: ready -> forwarding should never happen")
	case stateFound:
		tun.state = stateForwarding
		return nil
	case stateForwarding:
		return status.Error(codes.Internal, "ForwardStream() called more than once")
	case stateDone:
		return status.Error(codes.Internal, "ForwardStream() called after Done()")
	case stateContextDone:
		return status.Error(codes.Canceled, "ForwardStream() called on done stream")
	default:
		return status.Errorf(codes.Internal, "unreachable: invalid state: %d", tun.state)
	}
}

func (r *registryStripe) onTunnelDone(ctx context.Context, tun *tunnelImpl) {
	ctx, span := r.tracer.Start(ctx, "registryStripe.onTunnelDone", trace.WithSpanKind(trace.SpanKindInternal))
	defer span.End()

	r.mu.Lock()
	defer r.mu.Unlock()
	r.onTunnelDoneLocked(ctx, tun)
}

func (r *registryStripe) onTunnelDoneLocked(ctx context.Context, tun *tunnelImpl) {
	switch tun.state {
	case stateReady:
		panic(errors.New("unreachable: ready -> done should never happen"))
	case stateFound:
		// Tunnel was found but was not used, Done() was called. Just put it back.
		r.registerTunnelLocked(ctx, tun)
	case stateForwarding:
		tun.state = stateDone
	case stateDone:
		panic(errors.New("Done() called more than once"))
	case stateContextDone:
	// Done() called after cancelled context in HandleTunnel(). Nothing to do.
	default:
		// Should never happen
		panic(fmt.Errorf("invalid state: %d", tun.state))
	}
}

func (r *registryStripe) deleteFindRequestLocked(ftr *findTunnelRequest) {
	findRequestsForAgentId := r.findRequestsByAgentId[ftr.agentId]
	delete(findRequestsForAgentId, ftr)
	if len(findRequestsForAgentId) == 0 {
		delete(r.findRequestsByAgentId, ftr.agentId)
	}
}

// Stop aborts any open tunnels.
// It should not be necessary to abort tunnels when registry is used correctly i.e. this method is called after
// all tunnels have terminated gracefully.
func (r *registryStripe) Stop(ctx context.Context) (int /*stoppedTun*/, int /*abortedFtr*/) {
	stoppedTun := 0
	abortedFtr := 0

	r.mu.Lock()
	defer r.mu.Unlock()

	// 1. Abort all waiting new stream requests
	for _, findRequestsForAgentId := range r.findRequestsByAgentId {
		for ftr := range findRequestsForAgentId {
			abortedFtr++
			ftr.retTun <- nil
		}
	}
	r.findRequestsByAgentId = map[int64]map[*findTunnelRequest]struct{}{} // TODO use clear() in Go 1.21

	// 2. Abort all tunnels
	var wg wait.Group
	defer wg.Wait()
	var waitForIOs []<-chan struct{} // nolint: prealloc
	for agentId, info := range r.tunsByAgentId {
		if len(info.tuns) == 0 {
			if info.stopIO() { // Try to stop delayed unregistration to unregister ASAP instead
				// Succeeded, close the channel to signal any waiters that I/O "has been done".
				close(info.waitForIO)
			} else {
				waitForIOs = append(waitForIOs, info.waitForIO) // wait for the current unregistration I/O to finish.
				continue                                        // unregistered this one, so go to the next tunnel
			}
		} else {
			for tun := range info.tuns {
				stoppedTun++
				tun.state = stateDone
				tun.tunnelRetErr <- nil // nil so that HandleTunnel() returns cleanly and agent immediately retries
			}
			waitForIOs = append(waitForIOs, info.waitForIO)
		}
		unregister, waitForIO := r.unregisterTunnelIO(ctx, agentId)
		wg.Start(unregister) // do I/O concurrently
		waitForIOs = append(waitForIOs, waitForIO)
	}
	r.tunsByAgentId = make(map[int64]agentId2tunInfo) // TODO use clear() in Go 1.21

	for _, w := range waitForIOs {
		<-w // wait for the current (un)registration I/O to finish
	}

	if stoppedTun > 0 || abortedFtr > 0 {
		r.api.HandleProcessingError(ctx, r.log, modshared.NoAgentId, "Stopped tunnels and aborted find requests", fmt.Errorf("num_tunnels=%d, num_find_requests=%d", stoppedTun, abortedFtr))
	}
	return stoppedTun, abortedFtr
}

// contextWithoutCancel returns an independent context with existing tracing span.
// TODO use https://pkg.go.dev/context#WithoutCancel after upgrading to Go 1.21.
func contextWithoutCancel(ctx context.Context) context.Context {
	return trace.ContextWithSpan(context.Background(), trace.SpanFromContext(ctx))
}

func unstoppableIO() bool {
	return false
}
