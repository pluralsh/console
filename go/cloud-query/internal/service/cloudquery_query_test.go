package service

import (
	"context"
	"errors"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type contextQueryConnection struct {
	ctx context.Context
}

func (in *contextQueryConnection) QueryWithContext(ctx context.Context, _ string, _ ...any) ([]string, [][]any, error) {
	in.ctx = ctx
	return nil, nil, ctx.Err()
}

func TestHandleQueryPropagatesCancellationContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	connection := &contextQueryConnection{}
	_, err := (&CloudQueryService{}).handleQuery(ctx, connection, "select 1")

	if connection.ctx != ctx {
		t.Fatal("expected query to receive the RPC context")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected canceled query, got %v", err)
	}
}

func TestWrapInternalPreservesContextStatus(t *testing.T) {
	tests := []struct {
		name string
		err  error
		code codes.Code
	}{
		{name: "canceled", err: context.Canceled, code: codes.Canceled},
		{name: "deadline exceeded", err: context.DeadlineExceeded, code: codes.DeadlineExceeded},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := wrapInternal(tt.err, "query failed: %v", tt.err)
			if got := status.Code(err); got != tt.code {
				t.Fatalf("expected status %s, got %s", tt.code, got)
			}
		})
	}
}
