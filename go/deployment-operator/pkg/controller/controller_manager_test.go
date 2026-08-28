package controller

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
)

type managerWaitSocket struct{}

func (managerWaitSocket) AddPublisher(string, websocket.Publisher) {}

func (managerWaitSocket) Join() error {
	return nil
}

func (managerWaitSocket) Close() error {
	return nil
}

func TestManagerWait(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mgr, err := NewControllerManager(WithSocket(managerWaitSocket{}))
	if err != nil {
		t.Fatalf("creating manager: %v", err)
	}

	if err := mgr.Start(ctx); err != nil {
		t.Fatalf("starting manager: %v", err)
	}

	waitDone := make(chan struct{})
	go func() {
		if err := mgr.Wait(context.Background()); err != nil {
			t.Errorf("waiting for manager: %v", err)
		}
		close(waitDone)
	}()

	select {
	case <-waitDone:
		t.Fatal("manager reported shutdown before context cancellation")
	case <-time.After(10 * time.Millisecond):
	}

	cancel()

	select {
	case <-waitDone:
	case <-time.After(time.Second):
		t.Fatal("manager did not report shutdown")
	}

	// Wait remains safe and returns after the shutdown signal has been sent.
	if err := mgr.Wait(context.Background()); err != nil {
		t.Fatalf("waiting for stopped manager: %v", err)
	}
}

func TestManagerWaitContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mgr, err := NewControllerManager(WithSocket(managerWaitSocket{}))
	if err != nil {
		t.Fatalf("creating manager: %v", err)
	}

	if err := mgr.Start(ctx); err != nil {
		t.Fatalf("starting manager: %v", err)
	}

	canceledWaitCtx, cancelWait := context.WithCancel(context.Background())
	cancelWait()
	if err := mgr.Wait(canceledWaitCtx); !errors.Is(err, context.Canceled) {
		t.Fatalf("waiting with canceled context: got %v, want %v", err, context.Canceled)
	}

	waitCtx, waitCancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer waitCancel()
	if err := mgr.Wait(waitCtx); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("waiting with deadline: got %v, want %v", err, context.DeadlineExceeded)
	}

	cancel()
	if err := mgr.Wait(context.Background()); err != nil {
		t.Fatalf("waiting for manager after cancellation: %v", err)
	}
}
