package scm

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/pluralsh/deployment-operator/internal/utils"
)

// PRState is the state of a pull request.
type PRState string

const (
	PRStateOpen   PRState = "open"
	PRStateClosed PRState = "closed"
	PRStateMerged PRState = "merged"
)

// PRDetails is the live state of a pull request fetched directly from the SCM provider.
type PRDetails struct {
	Title    string
	Body     string
	HeadRef  string  // source branch of the PR (e.g. "feat/my-branch")
	State    PRState // PRStateOpen, PRStateClosed, PRStateMerged
	Comments []PRComment
	CIChecks []CICheck
}

// PRCommentType distinguishes top-level issue comments from inline review comments.
type PRCommentType string

const (
	PRCommentTypeIssue  PRCommentType = "issue"
	PRCommentTypeReview PRCommentType = "review"
)

// PRComment is a single review or issue comment on the PR.
type PRComment struct {
	// ID is the numeric provider comment ID
	ID string
	// Type distinguishes top level issue comments from inline review comments, which have separate reaction endpoints in GitHub's API.
	// Used to route react API calls to the correct endpoint.
	Type      PRCommentType
	Author    string
	Body      string
	CreatedAt time.Time
}

// ReactableID returns a composite key that encodes both the comment type and
// numeric ID e.g. "issue:123456" or "review:789012".
// This is the value the agent should pass to the reactToComment MCP tool.
func (c PRComment) ReactableID() string {
	return string(c.Type) + ":" + c.ID
}

// CICheck is a single CI check run or commit status.
type CICheck struct {
	Name       string
	Status     string // "queued", "in_progress", "completed"
	Conclusion string // "success", "failure", "neutral", "cancelled", "skipped", "timed_out", ""
	// CheckRunID is the provider-specific ID used to fetch logs (GitHub check run ID).
	CheckRunID int64
}

// CommentReactState is the agent's work state conveyed as a GitHub reaction.
type CommentReactState string

const (
	// CommentReactStateWorking maps to (eyes) — agent is looking at it.
	CommentReactStateWorking CommentReactState = "working"
	// CommentReactStateComplete maps to (+1) — agent finished.
	CommentReactStateComplete CommentReactState = "complete"
)

// Client fetches live PR state directly from the SCM provider.
type Client interface {
	GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error)
	// GetCILogs fetches the log output for a single failed check run.
	// prURL is used to resolve owner/repo; checkRunID is from CICheck.CheckRunID.
	GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error)
	// ReactToComment adds a reaction emoji to a PR comment.
	// reactableID is in the format "<type>:<numericID>" (from PRComment.ReactableID()).
	ReactToComment(ctx context.Context, prURL string, reactableID string, state CommentReactState) error
}

// NewClient returns a provider-dispatching SCM client using token auth.
// The provider is inferred from the PR URL host.
func NewClient(token string) Client {
	return &dispatchClient{token: token}
}

type dispatchClient struct {
	token string
}

func (d *dispatchClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	c, err := d.clientFor(prURL)
	if err != nil {
		return nil, err
	}
	return c.GetPRDetails(ctx, prURL)
}

func (d *dispatchClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	c, err := d.clientFor(prURL)
	if err != nil {
		return "", err
	}
	return c.GetCILogs(ctx, prURL, checkRunID)
}

func (d *dispatchClient) ReactToComment(ctx context.Context, prURL string, reactableID string, state CommentReactState) error {
	c, err := d.clientFor(prURL)
	if err != nil {
		return err
	}
	return c.ReactToComment(ctx, prURL, reactableID, state)
}

func (d *dispatchClient) clientFor(prURL string) (Client, error) {
	u, err := url.Parse(prURL)
	if err != nil {
		return nil, fmt.Errorf("invalid PR URL %q: %w", prURL, err)
	}
	host := strings.ToLower(u.Host)
	switch {
	case strings.Contains(host, "github"):
		return newGitHubClient(d.token, host), nil
	case strings.Contains(host, "gitlab"):
		return newGitLabClient(d.token, host), nil
	default:
		return nil, fmt.Errorf("unsupported SCM host %q: only GitHub and GitLab are supported", host)
	}
}

// PRStateHash produces a stable dedup hash over one or more PRDetails.
// Comments are keyed "id:body" (edits are detected), CI checks by "name:conclusion".
// Both are sorted before hashing so insertion order never causes false positives.
func PRStateHash(details ...*PRDetails) (string, error) {
	type hashable struct {
		Title    string
		Body     string
		Comments []string
		CIChecks []string
	}
	all := make([]hashable, 0, len(details))
	for _, d := range details {
		if d == nil {
			continue
		}
		h := hashable{Title: d.Title, Body: d.Body}
		for _, c := range d.Comments {
			h.Comments = append(h.Comments, c.ID+":"+c.Body)
		}
		for _, ci := range d.CIChecks {
			h.CIChecks = append(h.CIChecks, ci.Name+":"+ci.Conclusion)
		}
		sort.Strings(h.Comments)
		sort.Strings(h.CIChecks)
		all = append(all, h)
	}
	return utils.HashObject(all)
}
