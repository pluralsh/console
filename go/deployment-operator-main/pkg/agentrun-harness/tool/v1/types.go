package v1

import (
	"context"
	"time"

	console "github.com/pluralsh/console/go/client"

	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/scm"
)

const (
	SystemPromptFile = "AGENTS.md"
)

// EnrichedPR pairs the Console PR fragment with its live SCM state.
type EnrichedPR struct {
	URL     string
	Title   string
	Details *scm.PRDetails
}

// BabysitContext is passed to BabysitRun when PR state has changed since the last check.
// A nil BabysitContext means nothing has changed and the tool should skip reprompting.
type BabysitContext struct {
	// PRs is the list of open PRs with live SCM state.
	PRs []EnrichedPR
	// Prompt is the pre-built reprompt message for the AI.
	Prompt string
	// LastCheckedAt records the time of the previous check, so the AI can
	// filter comments it has already addressed.
	LastCheckedAt time.Time
	// Branch is the working branch the agent must commit to.
	Branch string
	// RepositoryDir is the absolute path to the cloned repository on disk.
	RepositoryDir string
}

// Tool handles one of the supported AI agents CLI tools.
// The list of supported tools is based on the console.AgentRuntimeType.
type Tool interface {
	// Run executes the tool in the background. Use Config to get the tool configuration
	// and signal when the tool is finished or failed.
	Run(ctx context.Context, options ...exec.Option)

	// BabysitRun is called periodically by the babysit loop.
	// bCtx is non-nil only when PR state has changed and the agent needs reprompting.
	// Returning true exits the loop.
	BabysitRun(ctx context.Context, bCtx *BabysitContext) bool

	// ConfigureBabysitRun ConfigureSystemPrompt prepares system prompt/context files for the provider and puts them in the required directory
	ConfigureBabysitRun() error

	// Configure configures the provider CLI.
	Configure(consoleURL, consoleToken, deployToken string) error

	// OnMessage registers a callback called when a new message is received.
	OnMessage(func(message *console.AgentMessageAttributes))
}

// DefaultTool is a partial base implementation of the Tool interface.
// It contains the common configuration logic.
type DefaultTool struct {
	Config Config
}

type Config struct {
	// WorkDir is the working directory for the tool.
	WorkDir string

	// RepositoryDir is the directory where the cloned repository is located.
	RepositoryDir string

	// FinishedChan is a channel that gets closed when the tool is finished.
	FinishedChan chan struct{}

	// ErrorChan is a channel that returns an error if the tool failed
	// and immediately closes.
	ErrorChan chan error

	// Run is the agent run that is being processed.
	Run *v1.AgentRun

	// SkipInitialRun skips the actual AI CLI execution in Run() and signals
	// completion immediately. Use this in tests to jump straight to babysitLoop
	// without needing a real Claude/Gemini/Codex process.
	SkipInitialRun bool
}
