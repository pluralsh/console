// Package prs readies a checkout for a pull request: it writes the title, body and commit message from the changes
// the box holds, branches off the default branch if needed, commits and pushes. Console opens the pull request.
package prs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc/codes"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/gitutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

const (
	// contextLimit caps the diff sent to the writer.
	contextLimit  = 48 << 10
	writerTimeout = 3 * time.Minute
	fetchTimeout  = 30 * time.Second

	WriterAIProxy  = "ai_proxy"
	WriterTemplate = "template"
)

// Options wire the preparer to the daemon.
type Options struct {
	// Checkouts lists the checkouts, thread worktrees included.
	Checkouts func(ctx context.Context) []*devboxv1.Checkout
	// Env is the environment git and the agent CLIs run with (git identity and credentials, CA trust).
	Env       func() []string
	Endpoints func() *devboxv1.HarnessEndpoints
	// Client reaches the AI proxy through egress.
	Client        *http.Client
	Harness       *harness.Config
	RecentPrompts func(threadID string) []string
	Log           *slog.Logger
}

// Preparer serves PreparePullRequest, one at a time per checkout.
type Preparer struct {
	opts Options
	mu   sync.Mutex
	busy map[string]bool
}

func New(opts Options) *Preparer {
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	return &Preparer{opts: opts, busy: map[string]bool{}}
}

// Text is what the writer produces. CommitMessage is only used for uncommitted changes.
type Text struct {
	Branch        string `json:"branch"`
	CommitMessage string `json:"commit_message"`
	Title         string `json:"title"`
	Body          string `json:"body"`
}

func (p *Preparer) Prepare(ctx context.Context, req *devboxv1.PreparePullRequestRequest) (*devboxv1.PreparePullRequestResponse, error) {
	co := p.find(ctx, req.GetRepository())
	if co == nil {
		return nil, derr.New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED,
			fmt.Sprintf("no checkout %q in this devbox", req.GetRepository()), nil)
	}
	dir := co.GetPath()
	if !p.claim(dir) {
		return nil, derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED,
			"a pull request is already being prepared for "+co.GetName(), nil)
	}
	defer p.release(dir)

	env := p.opts.Env()
	co, err := gitutil.Inspect(ctx, dir)
	if err != nil {
		return nil, err
	}
	if co.GetRemoteUrl() == "" {
		return nil, precondition(co.GetName() + " has no origin remote to push to")
	}
	base := co.GetDefaultBranch()
	if base == "" {
		return nil, precondition("couldn't find the default branch of " + co.GetName())
	}
	fctx, cancel := context.WithTimeout(ctx, fetchTimeout)
	_, _ = gitutil.RunEnv(fctx, dir, env, "fetch", "--quiet", "origin", base)
	cancel()
	baseRef := "origin/" + base
	if _, err := gitutil.Run(ctx, dir, "rev-parse", "--verify", "-q", baseRef); err != nil {
		baseRef = base
	}

	cx := gather(ctx, dir, baseRef, co)
	if !cx.dirty && cx.commits == "" {
		return nil, precondition(co.GetName() + " has no changes to open a pull request for")
	}
	threadID := co.GetWorktreeThreadId()
	if threadID == "" {
		threadID = req.GetThreadId()
	}
	if threadID != "" && p.opts.RecentPrompts != nil {
		cx.prompts = p.opts.RecentPrompts(threadID)
	}

	text, writer := p.write(ctx, req, dir, cx)

	branch := co.GetBranch()
	if branch == "" || branch == base {
		branch = p.freeBranch(ctx, dir, slugBranch(text.Branch, text.Title))
		if _, err := gitutil.RunEnv(ctx, dir, env, "checkout", "-b", branch); err != nil {
			return nil, err
		}
	}
	committed := false
	if cx.dirty {
		if _, err := gitutil.RunEnv(ctx, dir, env, "add", "-A"); err != nil {
			return nil, err
		}
		if _, err := gitutil.RunEnv(ctx, dir, env, "commit", "--quiet", "-m", text.CommitMessage); err != nil {
			return nil, err
		}
		committed = true
	}
	if _, err := gitutil.RunEnv(ctx, dir, env, "push", "--quiet", "-u", "origin", "HEAD:refs/heads/"+branch); err != nil {
		return nil, err
	}

	resp := &devboxv1.PreparePullRequestResponse{
		RemoteUrl: co.GetRemoteUrl(), CheckoutPath: dir, HeadBranch: branch, BaseBranch: base,
		Title: text.Title, Body: text.Body, Committed: committed, Writer: writer,
	}
	if st, err := gitutil.BranchDiffStat(ctx, dir, baseRef, "HEAD"); err == nil {
		resp.Additions, resp.Deletions = int32(st.Additions), int32(st.Deletions)
		resp.BaseSha, resp.HeadSha = st.BaseSHA, st.HeadSHA
	}
	return resp, nil
}

func precondition(msg string) error {
	return derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, msg, nil)
}

// find matches a checkout by path, else by name, preferring a main checkout over a worktree of the same name.
func (p *Preparer) find(ctx context.Context, repository string) *devboxv1.Checkout {
	r := strings.TrimSuffix(strings.TrimSpace(repository), "/")
	var byName *devboxv1.Checkout
	for _, c := range p.opts.Checkouts(ctx) {
		if c.GetPath() == r {
			return c
		}
		if c.GetName() == r && (byName == nil || byName.GetWorktreeThreadId() != "") {
			byName = c
		}
	}
	return byName
}

func (p *Preparer) claim(dir string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.busy[dir] {
		return false
	}
	p.busy[dir] = true
	return true
}

func (p *Preparer) release(dir string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.busy, dir)
}

// changeContext is what the writer sees of a checkout.
type changeContext struct {
	repo    string
	branch  string
	base    string
	dirty   bool
	status  string
	commits string
	stat    string
	diff    string
	prompts []string
}

func gather(ctx context.Context, dir, baseRef string, co *devboxv1.Checkout) changeContext {
	out := func(args ...string) string {
		b, _ := gitutil.Run(ctx, dir, args...)
		return strings.TrimSpace(string(b))
	}
	cx := changeContext{repo: co.GetName(), branch: co.GetBranch(), base: co.GetDefaultBranch()}
	cx.status = out("status", "--porcelain=v1", "--untracked-files=all")
	cx.dirty = cx.status != ""
	cx.commits = out("log", "--format=%s", baseRef+"..HEAD")
	mergeBase := out("merge-base", baseRef, "HEAD")
	if mergeBase == "" {
		mergeBase = gitutil.EmptyTree
	}
	// the working tree against the merge base: commits on the branch plus uncommitted edits
	cx.stat = out("diff", "--stat", mergeBase)
	cx.diff = out("diff", mergeBase)
	if len(cx.diff) > contextLimit {
		cx.diff = cx.diff[:contextLimit] + "\n... (diff truncated)"
	}
	return cx
}

const instructions = `You prepare a pull request for changes a developer made in a development sandbox. ` +
	`Reply with only a JSON object, no prose or code fences, with these string fields:
- "branch": a short kebab-case git branch name for the change, without any prefix
- "commit_message": a conventional commit message for the uncommitted changes (summary line under 72 characters, then a blank line and a short body if useful)
- "title": a concise pull request title under 72 characters
- "body": a markdown pull request description: a short summary of what changed and why, then a bulleted list of the notable changes. Don't invent testing you can't see.`

func (cx changeContext) prompt() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Repository: %s\nBase branch: %s\n", cx.repo, cx.base)
	if cx.branch != "" && cx.branch != cx.base {
		fmt.Fprintf(&b, "Current branch: %s\n", cx.branch)
	}
	if len(cx.prompts) > 0 {
		b.WriteString("\nThe developer's recent requests to their coding agent, oldest first:\n")
		for i, p := range cx.prompts {
			fmt.Fprintf(&b, "%d. %s\n", i+1, p)
		}
	}
	if cx.commits != "" {
		fmt.Fprintf(&b, "\nCommits already on the branch, newest first:\n%s\n", cx.commits)
	}
	if cx.status != "" {
		fmt.Fprintf(&b, "\nUncommitted changes (git status):\n%s\n", cx.status)
	}
	fmt.Fprintf(&b, "\nDiff stat against the base:\n%s\n\nDiff against the base:\n%s\n", cx.stat, cx.diff)
	return b.String()
}

// write asks the AI proxy when console gave a model, else the subscription agent's CLI, else fills a template.
// Missing fields are filled from the template, so a partial answer still makes a pull request.
func (p *Preparer) write(ctx context.Context, req *devboxv1.PreparePullRequestRequest, dir string, cx changeContext) (Text, string) {
	fallback := templateText(cx)
	var (
		text   Text
		writer string
		err    error
	)
	switch {
	case req.GetModel() != "":
		writer = WriterAIProxy
		text, err = p.askProxy(ctx, req.GetModel(), cx)
	case req.GetAgent() != devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED && p.opts.Harness != nil:
		writer = harness.AgentName(req.GetAgent())
		text, err = p.askAgent(ctx, req.GetAgent(), dir, cx)
	default:
		return fallback, WriterTemplate
	}
	if err != nil {
		p.opts.Log.Warn("pull request writer failed, using the template", "writer", writer, "err", err)
		return fallback, WriterTemplate
	}
	return text.or(fallback), writer
}

func (t Text) or(f Text) Text {
	pick := func(a, b string) string {
		if strings.TrimSpace(a) == "" {
			return b
		}
		return strings.TrimSpace(a)
	}
	return Text{Branch: pick(t.Branch, f.Branch), CommitMessage: pick(t.CommitMessage, f.CommitMessage),
		Title: pick(t.Title, f.Title), Body: pick(t.Body, f.Body)}
}

func templateText(cx changeContext) Text {
	title := "Changes from devbox"
	if first, _, _ := strings.Cut(cx.commits, "\n"); first != "" && !strings.Contains(cx.commits, "\n") {
		title = first
	}
	body := "Changes made in a Plural devbox.\n"
	if cx.commits != "" {
		body += "\n## Commits\n"
		for _, c := range strings.Split(cx.commits, "\n") {
			body += "- " + c + "\n"
		}
	}
	if cx.stat != "" {
		body += "\n```\n" + cx.stat + "\n```\n"
	}
	return Text{Branch: "devbox-changes", CommitMessage: "Update from devbox", Title: title, Body: body}
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

func (p *Preparer) askProxy(ctx context.Context, model string, cx changeContext) (Text, error) {
	base := strings.TrimSuffix(p.opts.Endpoints().GetAiProxyUrl(), "/")
	if base == "" {
		return Text{}, errors.New("no AI proxy is configured")
	}
	ctx, cancel := context.WithTimeout(ctx, writerTimeout)
	defer cancel()
	body, _ := json.Marshal(chatRequest{Model: model, Messages: []chatMessage{
		{Role: "system", Content: instructions},
		{Role: "user", Content: cx.prompt()},
	}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Text{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+harness.PlaceholderKey)
	res, err := p.opts.Client.Do(req)
	if err != nil {
		return Text{}, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK {
		return Text{}, fmt.Errorf("AI proxy: %s %s", res.Status, truncate(string(data), 200))
	}
	var cr chatResponse
	if err := json.Unmarshal(data, &cr); err != nil || len(cr.Choices) == 0 {
		return Text{}, errors.New("AI proxy returned no answer")
	}
	return parseText(cr.Choices[0].Message.Content)
}

func (p *Preparer) askAgent(ctx context.Context, agent devboxv1.AgentType, dir string, cx changeContext) (Text, error) {
	tmp, err := os.CreateTemp("", "devbox-pr-*.txt")
	if err != nil {
		return Text{}, err
	}
	_ = tmp.Close()
	defer os.Remove(tmp.Name())
	path, args, env, err := p.opts.Harness.Headless(agent, instructions+"\n\n"+cx.prompt(), tmp.Name())
	if err != nil {
		return Text{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, writerTimeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, path, args...)
	cmd.Dir, cmd.Env = dir, env
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	if err := proc.Run(cmd); err != nil {
		return Text{}, fmt.Errorf("%s: %w: %s", filepath.Base(path), err, truncate(stderr.String(), 200))
	}
	if agent == devboxv1.AgentType_AGENT_TYPE_CODEX {
		last, err := os.ReadFile(tmp.Name())
		if err != nil {
			return Text{}, err
		}
		return parseText(string(last))
	}
	var result struct {
		Result  string `json:"result"`
		IsError bool   `json:"is_error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil || result.IsError {
		return Text{}, fmt.Errorf("claude returned no result: %s", truncate(stdout.String(), 200))
	}
	return parseText(result.Result)
}

// parseText reads the first JSON object out of an answer, tolerating code fences and prose around it.
func parseText(answer string) (Text, error) {
	start, end := strings.Index(answer, "{"), strings.LastIndex(answer, "}")
	if start < 0 || end <= start {
		return Text{}, fmt.Errorf("no JSON object in the answer: %s", truncate(answer, 200))
	}
	var t Text
	if err := json.Unmarshal([]byte(answer[start:end+1]), &t); err != nil {
		return Text{}, fmt.Errorf("unreadable answer: %w", err)
	}
	return t, nil
}

var (
	nonBranch = regexp.MustCompile(`[^a-z0-9._/-]+`)
	dashes    = regexp.MustCompile(`-{2,}`)
)

// slugBranch makes a devbox/<slug> branch name from the writer's suggestion, else the title.
func slugBranch(branch, title string) string {
	s := strings.ToLower(strings.TrimSpace(branch))
	if s == "" {
		s = strings.ToLower(title)
	}
	s = strings.TrimPrefix(s, "devbox/")
	s = dashes.ReplaceAllString(nonBranch.ReplaceAllString(s, "-"), "-")
	s = strings.Trim(strings.ReplaceAll(s, "..", "."), "-./")
	if len(s) > 48 {
		s = strings.TrimRight(s[:48], "-./")
	}
	if s == "" {
		s = "changes"
	}
	return "devbox/" + s
}

// freeBranch suffixes name until neither a local branch nor origin has it.
func (p *Preparer) freeBranch(ctx context.Context, dir, name string) string {
	taken := func(b string) bool {
		_, local := gitutil.Run(ctx, dir, "rev-parse", "--verify", "-q", "refs/heads/"+b)
		_, remote := gitutil.Run(ctx, dir, "rev-parse", "--verify", "-q", "refs/remotes/origin/"+b)
		return local == nil || remote == nil
	}
	candidate := name
	for i := 2; taken(candidate) && i < 100; i++ {
		candidate = fmt.Sprintf("%s-%d", name, i)
	}
	return candidate
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
