package scm

import (
	"context"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	gogithub "github.com/google/go-github/v68/github"
	"golang.org/x/oauth2"
)

var githubPRPattern = regexp.MustCompile(`github(?:\.[^/]+)?/([^/]+)/([^/]+)/pull/(\d+)`)

type gitHubClient struct {
	gh *gogithub.Client
}

func newGitHubClient(token, host string) *gitHubClient {
	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
	tc := oauth2.NewClient(context.Background(), ts)
	gh := gogithub.NewClient(tc)

	// GitHub Enterprise: upload/download URLs differ from api.github.com
	if host != "github.com" {
		baseURL := fmt.Sprintf("https://%s/api/v3/", host)
		uploadURL := fmt.Sprintf("https://%s/api/uploads/", host)
		gh, _ = gh.WithEnterpriseURLs(baseURL, uploadURL)
	}
	return &gitHubClient{gh: gh}
}

func (c *gitHubClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	m := githubPRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return nil, fmt.Errorf("cannot parse GitHub PR URL: %s", prURL)
	}
	owner, repo := m[1], m[2]
	number, _ := strconv.Atoi(m[3])

	pr, _, err := c.gh.PullRequests.Get(ctx, owner, repo, number)
	if err != nil {
		return nil, fmt.Errorf("get PR: %w", err)
	}

	comments, err := c.allComments(ctx, owner, repo, number)
	if err != nil {
		return nil, err
	}

	checks, err := c.checkRuns(ctx, owner, repo, pr.GetHead().GetSHA())
	if err != nil {
		return nil, err
	}

	state := PRStateOpen
	if !pr.GetMergedAt().IsZero() {
		state = PRStateMerged
	} else if pr.GetState() == "closed" {
		state = PRStateClosed
	}
	return &PRDetails{
		Title:    pr.GetTitle(),
		Body:     pr.GetBody(),
		HeadRef:  pr.GetHead().GetRef(),
		State:    state,
		Comments: comments,
		CIChecks: checks,
	}, nil
}

func (c *gitHubClient) allComments(ctx context.Context, owner, repo string, number int) ([]PRComment, error) {
	opts := &gogithub.IssueListCommentsOptions{ListOptions: gogithub.ListOptions{PerPage: 100}}
	var all []PRComment
	for {
		batch, resp, err := c.gh.Issues.ListComments(ctx, owner, repo, number, opts)
		if err != nil {
			return nil, fmt.Errorf("list issue comments: %w", err)
		}
		for _, c := range batch {
			all = append(all, PRComment{
				ID:        strconv.FormatInt(c.GetID(), 10),
				Type:      PRCommentTypeIssue,
				Author:    c.GetUser().GetLogin(),
				Body:      c.GetBody(),
				CreatedAt: c.GetCreatedAt().Time,
			})
		}
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	// Also fetch inline review comments
	ropts := &gogithub.PullRequestListCommentsOptions{ListOptions: gogithub.ListOptions{PerPage: 100}}
	for {
		batch, resp, err := c.gh.PullRequests.ListComments(ctx, owner, repo, number, ropts)
		if err != nil {
			return nil, fmt.Errorf("list review comments: %w", err)
		}
		for _, c := range batch {
			all = append(all, PRComment{
				ID:        strconv.FormatInt(c.GetID(), 10),
				Type:      PRCommentTypeReview,
				Author:    c.GetUser().GetLogin(),
				Body:      c.GetBody(),
				CreatedAt: c.GetCreatedAt().Time,
			})
		}
		if resp.NextPage == 0 {
			break
		}
		ropts.Page = resp.NextPage
	}

	return all, nil
}

func (c *gitHubClient) checkRuns(ctx context.Context, owner, repo, sha string) ([]CICheck, error) {
	opts := &gogithub.ListCheckRunsOptions{ListOptions: gogithub.ListOptions{PerPage: 100}}
	var all []CICheck
	for {
		result, resp, err := c.gh.Checks.ListCheckRunsForRef(ctx, owner, repo, sha, opts)
		if err != nil {
			return nil, fmt.Errorf("list check runs: %w", err)
		}
		for _, cr := range result.CheckRuns {
			all = append(all, CICheck{
				Name:       cr.GetName(),
				Status:     cr.GetStatus(),
				Conclusion: cr.GetConclusion(),
				CheckRunID: cr.GetID(),
			})
		}
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return all, nil
}

// GetCILogs downloads the log text for a GitHub Actions job (check run).
// go-github follows the redirect and returns the raw log body.
func (c *gitHubClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	m := githubPRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return "", fmt.Errorf("cannot parse GitHub PR URL: %s", prURL)
	}
	owner, repo := m[1], m[2]

	logsURL, resp, err := c.gh.Actions.GetWorkflowJobLogs(ctx, owner, repo, checkRunID, 3)
	if err != nil {
		// Fall back to returning the logs redirect URL if direct download failed.
		if logsURL != nil {
			return fmt.Sprintf("Logs available at: %s", logsURL.String()), nil
		}
		return "", fmt.Errorf("get job logs: %w", err)
	}
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
		raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 512*1024)) // cap at 512 KB
		if readErr == nil && len(raw) > 0 {
			return string(raw), nil
		}
	}
	if logsURL != nil {
		return fmt.Sprintf("Logs available at: %s", logsURL.String()), nil
	}
	return "", fmt.Errorf("no logs available for check run %d", checkRunID)
}

// ReactToComment adds a GitHub reaction to an issue or review comment.
// reactableID format: "issue:<numericID>" or "review:<numericID>".
// working  → adds "eyes".
// complete → removes "eyes" if present, then adds "+1".
func (c *gitHubClient) ReactToComment(ctx context.Context, prURL string, reactableID string, state CommentReactState) error {
	m := githubPRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return fmt.Errorf("cannot parse GitHub PR URL: %s", prURL)
	}
	owner, repo := m[1], m[2]

	parts := strings.SplitN(reactableID, ":", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid reactableID %q: expected format type:numericID", reactableID)
	}
	commentType, numericID := parts[0], parts[1]

	id, err := strconv.ParseInt(numericID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid comment ID %q: %w", numericID, err)
	}

	cType := PRCommentType(commentType)

	if state == CommentReactStateComplete {
		// Remove the "eyes" reaction if we previously added one.
		if err := c.deleteReaction(ctx, owner, repo, id, cType, "eyes"); err != nil {
			// Non-fatal — the eyes reaction may not exist; proceed to add +1.
			_ = err
		}
	}

	content := "eyes"
	if state == CommentReactStateComplete {
		content = "+1"
	}

	switch cType {
	case PRCommentTypeIssue:
		_, _, err = c.gh.Reactions.CreateIssueCommentReaction(ctx, owner, repo, id, content)
	case PRCommentTypeReview:
		_, _, err = c.gh.Reactions.CreatePullRequestCommentReaction(ctx, owner, repo, id, content)
	default:
		return fmt.Errorf("unknown comment type %q in reactableID", commentType)
	}
	return err
}

// deleteReaction removes a specific reaction content from a comment (best-effort).
func (c *gitHubClient) deleteReaction(ctx context.Context, owner, repo string, commentID int64, cType PRCommentType, content string) error {
	opts := &gogithub.ListOptions{PerPage: 100}
	for {
		var (
			reactions []*gogithub.Reaction
			resp      *gogithub.Response
			err       error
		)
		switch cType {
		case PRCommentTypeIssue:
			reactions, resp, err = c.gh.Reactions.ListIssueCommentReactions(ctx, owner, repo, commentID, opts)
		case PRCommentTypeReview:
			reactions, resp, err = c.gh.Reactions.ListPullRequestCommentReactions(ctx, owner, repo, commentID, opts)
		default:
			return nil
		}
		if err != nil {
			return err
		}
		for _, r := range reactions {
			if r.GetContent() == content {
				switch cType {
				case PRCommentTypeIssue:
					_, err = c.gh.Reactions.DeleteIssueCommentReaction(ctx, owner, repo, commentID, r.GetID())
				case PRCommentTypeReview:
					_, err = c.gh.Reactions.DeletePullRequestCommentReaction(ctx, owner, repo, commentID, r.GetID())
				}
				return err // delete the first match and return
			}
		}
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return nil
}
