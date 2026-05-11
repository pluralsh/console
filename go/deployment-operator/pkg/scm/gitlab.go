package scm

import (
	"context"
	"fmt"
)

// gitLabClient is a stub. Full implementation is pending.
type gitLabClient struct {
	token   string
	baseURL string
}

func newGitLabClient(token, host string) *gitLabClient {
	return &gitLabClient{
		token:   token,
		baseURL: fmt.Sprintf("https://%s", host),
	}
}

func (c *gitLabClient) GetPRDetails(_ context.Context, prURL string) (*PRDetails, error) {
	return nil, fmt.Errorf("GitLab SCM support not yet implemented (PR URL: %s)", prURL)
}

func (c *gitLabClient) GetCILogs(_ context.Context, prURL string, _ int64) (string, error) {
	return "", fmt.Errorf("GitLab SCM support not yet implemented (PR URL: %s)", prURL)
}

func (c *gitLabClient) ReactToComment(_ context.Context, prURL string, _ string, _ CommentReactState) error {
	return fmt.Errorf("GitLab SCM support not yet implemented (PR URL: %s)", prURL)
}
