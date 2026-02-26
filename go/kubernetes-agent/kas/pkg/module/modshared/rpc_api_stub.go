package modshared

import (
	"context"

	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

type RpcApiStub struct {
	StreamCtx context.Context
	Logger    *zap.Logger
}

func (a *RpcApiStub) PollWithBackoff(cfg retry.PollConfig, f retry.PollWithBackoffFunc) error {
	// this context must only be used here, not inside of f() - connection should be closed only when idle.
	ageCtx := grpctool.MaxConnectionAgeContextFromStreamContext(a.StreamCtx)
	err := retry.PollWithBackoff(ageCtx, cfg, func(ctx context.Context) (error, retry.AttemptResult) { // nolint:staticcheck
		return f()
	})
	if errz.ContextDone(err) {
		return nil // all good, ctx is done
	}
	return err
}

func (a *RpcApiStub) Log() *zap.Logger {
	return a.Logger
}
