package agentkapp

import (
	"context"
	"errors"
	"net/url"

	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
)

// agentAPI is an implementation of modagent.API.
type agentAPI struct {
	moduleName        string
	agentId           *ValueHolder[int64]
	gitLabExternalUrl *ValueHolder[url.URL]
}

func (a *agentAPI) GetAgentId(ctx context.Context) (int64, error) {
	return a.agentId.get(ctx)
}

func (a *agentAPI) GetGitLabExternalUrl(ctx context.Context) (url.URL, error) {
	return a.gitLabExternalUrl.get(ctx)
}

func (a *agentAPI) TryGetAgentId() (int64, bool) {
	return a.agentId.tryGet()
}

func (a *agentAPI) HandleProcessingError(ctx context.Context, log *zap.Logger, agentId int64, msg string, err error) {
	handleProcessingError(ctx, log, agentId, msg, err)
}

func handleProcessingError(ctx context.Context, log *zap.Logger, agentId int64, msg string, err error) { // nolint:unparam
	if grpctool.RequestCanceledOrTimedOut(err) {
		// An error caused by context signalling done
		return
	}
	var ue errz.UserError
	isUserError := errors.As(err, &ue)
	if isUserError {
		// TODO Don't log it, send it somewhere the user can see it https://gitlab.com/gitlab-org/gitlab/-/issues/277323
		// Log at Info for now.
		log.Info(msg, logz.Error(err))
	} else {
		// don't add logz.TraceIdFromContext(ctx) here as it's been added to the logger already
		log.Error(msg, logz.Error(err))
	}
}
