package controller

import (
	"context"
	"fmt"
	"path"
	"path/filepath"
	"strings"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/client"

	agentrunv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool"
	toolv1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/scm"
)

// Start starts the manager and waits indefinitely.
// There are a couple of ways to have start return:
//   - an error has occurred in one of the internal operations
//   - all commands have finished their execution
//   - it was running for too long and timed out
//   - remote cancellation signal was received and stopped the execution
func (in *agentRunController) Start(ctx context.Context) (retErr error) {
	in.Lock()

	ready := false
	defer func() {
		// Only unlock if we haven't reached
		// the internal readiness condition.
		if !ready {
			in.Unlock()
		}

		// Make sure to always run postStart before exiting
		in.postStart(retErr)
	}()

	if retErr = in.prepare(); retErr != nil {
		return retErr
	}

	in.preStart()

	in.tool.OnMessage(func(message *gqlclient.AgentMessageAttributes) {
		if message == nil {
			return
		}

		_, err := in.consoleClient.CreateAgentMessage(ctx, in.agentRunID, *message)
		if err != nil {
			klog.ErrorS(err, "failed to create agent message", "message", message)
		}
	})

	in.tool.Run(
		ctx,
		exec.WithHook(v1.LifecyclePreStart, in.preExecHook()),
		exec.WithHook(v1.LifecyclePostStart, in.postExecHook()),
	)

	go func() {
		in.babysitLoop(ctx, in.tool.BabysitRun)
		// Close done after the babysit loop exits so the controller's select
		// unblocks only once both Run and babysitting have fully completed.
		close(in.done)
	}()

	ready = true
	in.Unlock()
	select {
	// Stop the execution if provided context is done.
	case <-ctx.Done():
		retErr = context.Cause(ctx)
	// In case of any error finish the execution and return error.
	case err := <-in.errChan:
		retErr = err
	// If execution finished successfully, return without error.
	case <-in.done:
		retErr = nil
	}

	klog.V(log.LogLevelExtended).InfoS("all subroutines finished")
	return retErr
}

// prepare sets up the agent run environment and AI credentials
func (in *agentRunController) prepare() error {
	consoleTokenClient := client.New(fmt.Sprintf("%s/gql", in.consoleUrl), *in.agentRun.PluralCreds.Token)
	env := environment.New(
		environment.WithAgentRun(in.agentRun),
		environment.WithWorkingDir(path.Join(in.dir, "shared")),
		environment.WithConsoleTokenClient(consoleTokenClient),
	)

	if err := env.Setup(); err != nil {
		return err
	}

	var err error
	if in.tool, err = tool.New(in.agentRun.Runtime.Type, toolv1.Config{
		WorkDir:       in.dir,
		RepositoryDir: filepath.Join(in.dir, "shared", "repository"),
		FinishedChan:  in.done,
		ErrorChan:     in.errChan,
		Run:           in.agentRun,
	}); err != nil {
		klog.Fatal(err)
	}

	return in.tool.Configure(in.consoleUrl, *in.agentRun.PluralCreds.Token, in.deployToken)
}

// completeAgentRun updates the agent run status in the Console API
func (in *agentRunController) completeAgentRun(status gqlclient.AgentRunStatus, agentRunErr error) error {
	var errorMsg *string
	if agentRunErr != nil {
		msg := agentRunErr.Error()
		errorMsg = &msg
	}

	statusAttrs := gqlclient.AgentRunStatusAttributes{
		Status: status,
		Error:  errorMsg,
	}

	_, err := in.consoleClient.UpdateAgentRun(context.Background(), in.agentRunID, statusAttrs)
	return err
}

// init initializes the controller with the agent run data from Console API
func (in *agentRunController) init() (Controller, error) {
	if len(in.agentRunID) == 0 {
		return nil, fmt.Errorf("could not initialize controller: agent run id is empty")
	}

	if in.consoleClient == nil {
		return nil, fmt.Errorf("could not initialize controller: consoleClient is nil")
	}

	// Fetch agent run from Console API
	agentRunFragment, err := in.consoleClient.GetAgentRun(context.Background(), in.agentRunID)
	if err != nil {
		return nil, fmt.Errorf("could not fetch agent run: %w", err)
	}

	// Convert console fragment to harness type
	in.agentRun = (&agentrunv1.AgentRun{}).FromAgentRunFragment(agentRunFragment)

	klog.V(log.LogLevelInfo).InfoS("found agent run",
		"id", in.agentRun.ID,
		"status", in.agentRun.Status,
		"mode", in.agentRun.Mode,
		"type", in.agentRun.Runtime.Type,
		"repository", in.agentRun.Repository)

	return in, nil
}

// babysitLoop runs the callback periodically while babysit is enabled.
// It stops when ctx is done, the done channel is closed, or all PRs are terminal.
func (in *agentRunController) babysitLoop(ctx context.Context, callback func(ctx context.Context, bCtx *toolv1.BabysitContext) bool,
) {
	d := time.Duration(in.agentRun.BabysitInterval) * time.Second

	// Wait for initial Run() to complete.
	select {
	case <-ctx.Done():
		return
	case <-in.done:
		return
	case <-in.runDone:
		klog.Info("initial agent run completed, starting babysit loop")
		if !in.agentRun.Babysit {
			return
		}
		if err := in.tool.ConfigureBabysitRun(); err != nil {
			return
		}
	}

	// Run immediately, then wait d after each call completes before running again.
	for {
		if in.runBabysit(ctx, callback) {
			return
		}

		select {
		case <-ctx.Done():
			return
		case <-in.done:
			return
		case <-time.After(d):
		}
	}
}

func (in *agentRunController) runBabysit(ctx context.Context, callback func(ctx context.Context, bCtx *toolv1.BabysitContext) bool) bool {
	agentRun, err := in.consoleClient.UpdateAgentRun(ctx, in.agentRunID, gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusBabysitting})
	if err != nil {
		klog.ErrorS(err, "failed to update agent run status during babysit")
		return false
	}

	// Exit if all PRs are terminal or if there are no PRs to babysit, using live SCM data.
	if len(agentRun.PullRequests) == 0 {
		klog.V(log.LogLevelInfo).InfoS("no pull requests to babysit, stopping babysit loop")
		return true
	}

	// Check live PR status from SCM
	if in.agentRun.ScmCreds == nil || in.agentRun.ScmCreds.Token == "" {
		klog.V(log.LogLevelInfo).InfoS("no SCM credentials available, cannot check live PR status, continuing babysit loop")
	} else {
		scmClient := scm.NewClient(in.agentRun.ScmCreds.Token)
		allDone := true
		for _, pr := range agentRun.PullRequests {
			// Skip if PR URL is empty
			if pr.URL == "" {
				continue
			}
			details, err := scmClient.GetPRDetails(ctx, pr.URL)
			if err != nil {
				klog.ErrorS(err, "failed to fetch PR details from SCM", "url", pr.URL)
				allDone = false // If we can't check, don't exit babysit
				break
			}
			if details.State == scm.PRStateOpen {
				allDone = false
				break
			}
		}
		if allDone {
			klog.V(log.LogLevelInfo).InfoS("all pull requests are merged or closed in SCM, stopping babysit loop")
			return true
		}
	}

	bCtx := in.buildBabysitContext(ctx, agentRun)
	return callback(ctx, bCtx)
}

// buildBabysitContext fetches live PR data from the SCM provider, computes a
// dedup SHA, and returns a populated BabysitContext if the state has changed
// since the last check. Returns nil when nothing has changed (no reprompt needed).
func (in *agentRunController) buildBabysitContext(ctx context.Context, agentRun *gqlclient.AgentRunFragment) *toolv1.BabysitContext {
	if in.agentRun.ScmCreds == nil || in.agentRun.ScmCreds.Token == "" {
		klog.V(log.LogLevelInfo).InfoS("no SCM credentials available, skipping PR state fetch")
		return nil
	}

	scmClient := scm.NewClient(in.agentRun.ScmCreds.Token)

	var enriched []toolv1.EnrichedPR
	var details []*scm.PRDetails
	for _, pr := range agentRun.PullRequests {
		// Skip terminal PRs
		if pr.Status != nil && (*pr.Status == gqlclient.PrStatusMerged || *pr.Status == gqlclient.PrStatusClosed) {
			continue
		}

		d, err := scmClient.GetPRDetails(ctx, pr.URL)
		if err != nil {
			klog.ErrorS(err, "failed to fetch PR details from SCM", "url", pr.URL)
			continue
		}

		title := ""
		if pr.Title != nil {
			title = *pr.Title
		}
		enriched = append(enriched, toolv1.EnrichedPR{
			URL:     pr.URL,
			Title:   title,
			Details: d,
		})
		details = append(details, d)
	}

	if len(enriched) == 0 {
		return nil
	}

	sha, err := scm.PRStateHash(details...)
	if err != nil {
		klog.ErrorS(err, "failed to compute PR state hash")
		return nil
	}

	// SHA unchanged or empty
	if sha == in.lastPRSHA || in.lastPRSHA == "" {
		in.lastPRSHA = sha
		in.lastPRCheckAt = time.Now()
		klog.V(log.LogLevelExtended).InfoS("PR state unchanged, skipping reprompt")
		return nil
	}

	// Determine working branch from the live PR head ref.
	// Fall back to a generic placeholder if none of the PRs carry a head ref.
	branch := "your working branch"
	for _, e := range enriched {
		if e.Details != nil && e.Details.HeadRef != "" {
			branch = e.Details.HeadRef
			break
		}
	}

	repositoryDir := filepath.Join(in.dir, "shared", "repository")
	prompt := buildBabysitPrompt(branch, repositoryDir, enriched, in.lastPRCheckAt)

	// Persist the new SHA and timestamp so the next tick can diff against it.
	in.lastPRSHA = sha
	in.lastPRCheckAt = time.Now()

	return &toolv1.BabysitContext{
		PRs:           enriched,
		Prompt:        prompt,
		LastCheckedAt: in.lastPRCheckAt,
		Branch:        branch,
		RepositoryDir: repositoryDir,
	}
}

// buildBabysitPrompt constructs a structured reprompt message for the AI agent
// describing new PR activity (comments + CI failures) since the last check.
func buildBabysitPrompt(branch, _ string, prs []toolv1.EnrichedPR, lastChecked time.Time) string {
	lastCheckedStr := "<beginning>"
	if !lastChecked.IsZero() {
		lastCheckedStr = lastChecked.UTC().Format(time.RFC3339)
	}

	var sb strings.Builder
	_, _ = fmt.Fprintf(&sb,
		"Your pull requests have new activity since %s. Please take the following actions.\n\n",
		lastCheckedStr,
	)

	for _, e := range prs {
		_, _ = fmt.Fprintf(&sb, "## PR: %s\nURL: %s\n", e.Title, e.URL)
		_, _ = fmt.Fprintf(&sb, "### Branch: %s\n", branch)
		// New comments since last check.
		var newComments []scm.PRComment
		for _, c := range e.Details.Comments {
			if c.CreatedAt.After(lastChecked) {
				newComments = append(newComments, c)
			}
		}
		if len(newComments) > 0 {
			sb.WriteString("### New comments since last check\n\n")
			for _, c := range newComments {
				body := strings.ReplaceAll(c.Body, "\n", "\n  > ")
				_, _ = fmt.Fprintf(&sb, "- **%s** at %s (commentId: `%s`):\n  > %s\n\n",
					c.Author, c.CreatedAt.UTC().Format(time.RFC3339), c.ReactableID(), body)
			}
		} else {
			sb.WriteString("No new comments since last check.\n\n")
		}

		// CI check status.
		var failing, pending []scm.CICheck
		for _, ci := range e.Details.CIChecks {
			switch ci.Conclusion {
			case "failure", "timed_out", "cancelled":
				failing = append(failing, ci)
			case "":
				if ci.Status != "completed" {
					pending = append(pending, ci)
				}
			}
		}
		if len(failing) > 0 {
			sb.WriteString("### Failing CI checks — you MUST fix these\n\n")
			for _, ci := range failing {
				_, _ = fmt.Fprintf(&sb, "- **%s**: %s (%s)\n", ci.Name, ci.Status, ci.Conclusion)
			}
			sb.WriteString("\n")
		}
		if len(pending) > 0 {
			sb.WriteString("### CI checks still running\n\n")
			for _, ci := range pending {
				_, _ = fmt.Fprintf(&sb, "- **%s**: %s\n", ci.Name, ci.Status)
			}
			sb.WriteString("\n")
		}
		if len(failing) == 0 && len(pending) == 0 {
			sb.WriteString("All CI checks passed.\n\n")
		}
	}
	return sb.String()
}

// NewAgentRunController creates a new agent run controller
func NewAgentRunController(opts ...Option) (Controller, error) {
	finishedChan := make(chan struct{})
	errChan := make(chan error, 1)
	ctrl := &agentRunController{
		errChan: errChan,
		done:    finishedChan,
		runDone: make(chan struct{}),
		dir:     "/plural", // default working directory from pod spec
	}

	for _, option := range opts {
		option(ctrl)
	}

	return ctrl.init()
}
