package grpctool

type InboundStreamToOutboundStream struct {
	PipeInboundToOutbound func() error
	PipeOutboundToInbound func() error
}

func (x *InboundStreamToOutboundStream) Pipe() error {
	// Cancellation
	//
	// If one of the streams breaks, the other one needs to be aborted too ASAP. Waiting for a timeout
	// is a waste of resources and a bad API with unpredictable latency.
	//
	// The outbound stream is automatically aborted if there is a problem with inbound stream because
	// it uses the inbound stream's context.
	// Unlike the above, if there is a problem with the outbound stream, reads from the inbound stream in
	// PipeInboundToOutbound() are unaffected so can stay blocked for an arbitrary amount of time.
	//
	// To make gRPC abort those method calls, gRPC stream handler (i.e. this method) should just return from the call.
	// See https://github.com/grpc/grpc-go/issues/465#issuecomment-179414474
	//
	// Same as above for the HTTP server, see:
	// - https://github.com/golang/go/blob/go1.18.1/src/net/http/server.go#L1829
	// - https://github.com/golang/go/blob/go1.18.1/src/net/http/server.go#L1884
	// - https://github.com/golang/go/blob/go1.18.1/src/net/http/server.go#L1968
	//
	// To implement the above strategy, we read from the inbound stream in a separate goroutine and return from this
	// handler whenever there is an error, aborting reads from the inbound stream.

	// Channel of size 1 to ensure that if we return early, the other goroutine has space for the value.
	// We don't care about that value if we already got a non-nil error.
	res := make(chan error, 1)
	go func() {
		res <- x.PipeInboundToOutbound()
	}()
	err := x.PipeOutboundToInbound()
	if err != nil {
		return err // unblocks reads from inbound stream in the other goroutine if it is stuck
	}
	// Wait for the other goroutine to return to cleanly finish reading from the inbound stream
	return <-res
}
