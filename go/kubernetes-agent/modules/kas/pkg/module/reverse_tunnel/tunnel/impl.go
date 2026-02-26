package tunnel

import (
	"context"
	"io"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protoreflect"

	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/info"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

type stateType int

const (
	// zero value is invalid to catch initialization bugs.
	_ stateType = iota
	// stateReady - tunnel is owned by the registry and is ready to be found and used for forwarding.
	stateReady
	// stateFound - tunnel is not owned by registry, was found and about to be used for forwarding.
	stateFound
	// stateForwarding - tunnel is not owned by registry, is being used for forwarding.
	stateForwarding
	// stateDone - tunnel is not owned by anyone, it has been used for forwarding, Done() has been called.
	stateDone
	// stateContextDone - tunnel is not owned by anyone, reverse tunnel's context signalled done in HandleTunnel().
	stateContextDone
)

const (
	agentDescriptorNumber protoreflect.FieldNumber = 1
	headerNumber          protoreflect.FieldNumber = 2
	messageNumber         protoreflect.FieldNumber = 3
	trailerNumber         protoreflect.FieldNumber = 4
	errorNumber           protoreflect.FieldNumber = 5
)

type DataCallback interface {
	Header(map[string]*prototool.Values) error
	Message([]byte) error
	Trailer(map[string]*prototool.Values) error
	Error(*rpc2.Error) error
}

type RpcApi interface {
	HandleIoError(log *zap.Logger, msg string, err error) error
}

type Tunnel interface {
	// ForwardStream performs bi-directional message forwarding between incomingStream and the tunnel.
	// cb is called with header, messages and trailer coming from the tunnel. It's the callers
	// responsibility to forward them into the incomingStream.
	ForwardStream(log *zap.Logger, rpcApi RpcApi, incomingStream grpc.ServerStream, cb DataCallback) error
	// Done must be called when the caller is done with the Tunnel.
	// ctx is used for tracing only.
	Done(ctx context.Context)
}

type tunnelImpl struct {
	tunnel              rpc2.ReverseTunnel_ConnectServer
	tunnelStreamVisitor *grpctool2.StreamVisitor
	tunnelRetErr        chan<- error
	agentId             int64
	agentDescriptor     *info.AgentDescriptor
	state               stateType

	onForward func(*tunnelImpl) error
	onDone    func(context.Context, *tunnelImpl)
}

func (t *tunnelImpl) ForwardStream(log *zap.Logger, rpcApi RpcApi, incomingStream grpc.ServerStream, cb DataCallback) error {
	if err := t.onForward(t); err != nil {
		return err
	}
	pair := t.forwardStream(log, rpcApi, incomingStream, cb)
	t.tunnelRetErr <- pair.forTunnel
	return pair.forIncomingStream
}

func (t *tunnelImpl) forwardStream(log *zap.Logger, rpcApi RpcApi, incomingStream grpc.ServerStream, cb DataCallback) errPair {
	// Here we have a situation where we need to pipe one server stream into another server stream.
	// One stream is incoming request stream and the other one is incoming tunnel stream.
	// We need to use at least one extra goroutine in addition to the current one (or two separate ones) to
	// implement full duplex bidirectional stream piping. One goroutine reads and writes in one direction and the other
	// one in the opposite direction.
	// What if one of them returns an error? We need to unblock the other one, ideally ASAP, to release resources. If
	// it's not unblocked, it'll sit there until it hits a timeout or is aborted by peer. Ok-ish, but far from ideal.
	// To abort request processing on the server side, gRPC stream handler should just return from the call.
	// See https://github.com/grpc/grpc-go/issues/465#issuecomment-179414474
	// To implement this, we read and write in both directions in separate goroutines and return from both
	// handlers whenever there is an error, aborting both connections:
	// - Returning from this function means returning from the incoming request handler.
	// - Sending to c.tunnelRetErr leads to returning that value from the tunnel handler.

	// Channel of size 1 to ensure that if we return early, the second goroutine has space for the value.
	// We don't care about the second value if the first one has at least one non-nil error.
	res := make(chan errPair, 1)
	incomingCtx := incomingStream.Context()
	// Pipe incoming stream (i.e. data a client is sending us) into the tunnel stream
	goErrPair(res, func() (error /* forTunnel */, error /* forIncomingStream */) {
		md, _ := metadata.FromIncomingContext(incomingCtx)
		err := t.tunnel.Send(&rpc2.ConnectResponse{
			Msg: &rpc2.ConnectResponse_RequestInfo{
				RequestInfo: &rpc2.RequestInfo{
					MethodName: grpc.ServerTransportStreamFromContext(incomingCtx).Method(),
					Meta:       grpctool2.MetaToValuesMap(md),
				},
			},
		})
		if err != nil {
			err = rpcApi.HandleIoError(log, "Send(ConnectResponse_RequestInfo)", err)
			return err, err
		}
		// Outside the loop to allocate once vs on each message
		var frame grpctool2.RawFrame
		for {
			err = incomingStream.RecvMsg(&frame)
			if err != nil {
				if err == io.EOF { // nolint:errorlint
					break
				}
				return status.Error(codes.Canceled, "read from incoming stream"), err
			}
			err = t.tunnel.Send(&rpc2.ConnectResponse{
				Msg: &rpc2.ConnectResponse_Message{
					Message: &rpc2.Message{
						Data: frame.Data,
					},
				},
			})
			if err != nil {
				err = rpcApi.HandleIoError(log, "Send(ConnectResponse_Message)", err)
				return err, err
			}
		}
		err = t.tunnel.Send(&rpc2.ConnectResponse{
			Msg: &rpc2.ConnectResponse_CloseSend{
				CloseSend: &rpc2.CloseSend{},
			},
		})
		if err != nil {
			err = rpcApi.HandleIoError(log, "Send(ConnectResponse_CloseSend)", err)
			return err, err
		}
		return nil, nil
	})
	// Pipe tunnel stream (i.e. data agentk is sending us) into the incoming stream
	goErrPair(res, func() (error /* forTunnel */, error /* forIncomingStream */) {
		var forTunnel, forIncomingStream error
		fromVisitor := t.tunnelStreamVisitor.Visit(t.tunnel,
			grpctool2.WithStartState(agentDescriptorNumber),
			grpctool2.WithCallback(headerNumber, func(header *rpc2.Header) error {
				return cb.Header(header.Meta)
			}),
			grpctool2.WithCallback(messageNumber, func(message *rpc2.Message) error {
				return cb.Message(message.Data)
			}),
			grpctool2.WithCallback(trailerNumber, func(trailer *rpc2.Trailer) error {
				return cb.Trailer(trailer.Meta)
			}),
			grpctool2.WithCallback(errorNumber, func(rpcError *rpc2.Error) error {
				forIncomingStream = cb.Error(rpcError)
				// Not returning an error since we must be reading from the tunnel stream till io.EOF
				// to properly consume it. There is no need to abort it in this scenario.
				// The server is expected to close the stream (i.e. we'll get io.EOF) right after we got this message.
				return nil
			}),
		)
		if fromVisitor != nil {
			forIncomingStream = fromVisitor
			forTunnel = fromVisitor
		}
		return forTunnel, forIncomingStream
	})
	pair := <-res
	if !pair.isNil() {
		return pair
	}
	select {
	case <-incomingCtx.Done():
		// incoming stream finished sending all data (i.e. io.EOF was read from it) but
		// now it signals that it's closing. We need to abort the potentially stuck t.tunnel.RecvMsg().
		err := grpctool2.StatusErrorFromContext(incomingCtx, "Incoming stream closed")
		pair = errPair{
			forTunnel:         err,
			forIncomingStream: err,
		}
	case pair = <-res:
	}
	return pair
}

func (t *tunnelImpl) Done(ctx context.Context) {
	t.onDone(ctx, t)
}

type errPair struct {
	forTunnel         error
	forIncomingStream error
}

func (p errPair) isNil() bool {
	return p.forTunnel == nil && p.forIncomingStream == nil
}

func goErrPair(c chan<- errPair, f func() (error /* forTunnel */, error /* forIncomingStream */)) {
	go func() {
		var pair errPair
		pair.forTunnel, pair.forIncomingStream = f()
		c <- pair
	}()
}
