package scm

import (
	"context"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	"github.com/samber/lo"
	gogitlab "gitlab.com/gitlab-org/api/client-go"
)

// gitlabJobStatusFailed and gitlabJobStatusCanceled are the raw GitLab job
// status strings for terminal states (distinct from the shared "failure" /
// "cancelled" conclusion constants which follow the GitHub naming convention).
const (
	gitlabJobStatusFailed   = "failed"
	gitlabJobStatusCanceled = "canceled"

	gitlabMRStateMerged = "merged"
	gitlabMRStateClosed = "closed"
)

// gitlabMRPattern matches GitLab MR URLs, e.g.
// https://gitlab.com/group/subgroup/project/-/merge_requests/123
var gitlabMRPattern = regexp.MustCompile(`gitlab(?:\.[^/]+)?/(.+?)/-/merge_requests/(\d+)`)

type gitLabClient struct {
	gl *gogitlab.Client
}

func newGitLabClient(token, host string) *gitLabClient {
	baseURL := fmt.Sprintf("https://%s/", host)
	gl, _ := gogitlab.NewClient(token, gogitlab.WithBaseURL(baseURL))
	return &gitLabClient{gl: gl}
}

func (c *gitLabClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	projectPath, mrIID, err := parseGitLabMRURL(prURL)
	if err != nil {
		return nil, err
	}

	mr, _, err := c.gl.MergeRequests.GetMergeRequest(projectPath, mrIID, nil, gogitlab.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("get MR: %w", err)
	}

	comments, err := c.allComments(ctx, projectPath, mrIID)
	if err != nil {
		return nil, err
	}

	checks, err := c.ciChecks(ctx, projectPath, mr.SHA)
	if err != nil {
		return nil, err
	}

	state := PRStateOpen
	switch mr.State {
	case gitlabMRStateMerged:
		state = PRStateMerged
	case gitlabMRStateClosed:
		state = PRStateClosed
	}

	return &PRDetails{
		Title:    mr.Title,
		Body:     mr.Description,
		HeadRef:  mr.SourceBranch,
		State:    state,
		Comments: comments,
		CIChecks: checks,
	}, nil
}

func (c *gitLabClient) GetPRSummary(ctx context.Context, prURL string) (*PRDetails, error) {
	projectPath, mrIID, err := parseGitLabMRURL(prURL)
	if err != nil {
		return nil, err
	}

	mr, _, err := c.gl.MergeRequests.GetMergeRequest(projectPath, mrIID, nil, gogitlab.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("get MR: %w", err)
	}

	state := PRStateOpen
	switch mr.State {
	case gitlabMRStateMerged:
		state = PRStateMerged
	case gitlabMRStateClosed:
		state = PRStateClosed
	}

	return &PRDetails{
		Title:   mr.Title,
		Body:    mr.Description,
		HeadRef: mr.SourceBranch,
		State:   state,
	}, nil
}

func (c *gitLabClient) allComments(ctx context.Context, projectPath string, mrIID int64) ([]PRComment, error) {
	var all []PRComment
	noteOpts := &gogitlab.ListMergeRequestNotesOptions{ListOptions: gogitlab.ListOptions{PerPage: 100}}
	for {
		notes, resp, err := c.gl.Notes.ListMergeRequestNotes(projectPath, mrIID, noteOpts, gogitlab.WithContext(ctx))
		if err != nil {
			return nil, fmt.Errorf("list MR notes: %w", err)
		}
		for _, n := range notes {
			if n.System || n.Position != nil {
				continue // skip system notes and inline notes
			}
			all = append(all, PRComment{
				ID:        strconv.FormatInt(n.ID, 10),
				Type:      PRCommentTypeIssue,
				Author:    n.Author.Username,
				Body:      n.Body,
				CreatedAt: lo.FromPtr(n.CreatedAt),
			})
		}
		if resp.NextPage == 0 {
			break
		}
		noteOpts.Page = resp.NextPage
	}

	// Inline review notes from discussions
	discOpts := &gogitlab.ListMergeRequestDiscussionsOptions{ListOptions: gogitlab.ListOptions{PerPage: 100}}
	for {
		discussions, resp, err := c.gl.Discussions.ListMergeRequestDiscussions(projectPath, mrIID, discOpts, gogitlab.WithContext(ctx))
		if err != nil {
			return nil, fmt.Errorf("list MR discussions: %w", err)
		}
		for _, d := range discussions {
			for _, n := range d.Notes {
				if n.System || n.Position == nil {
					continue // skip system notes and non-inline notes
				}
				all = append(all, PRComment{
					ID:        strconv.FormatInt(n.ID, 10),
					Type:      PRCommentTypeReview,
					Author:    n.Author.Username,
					Body:      n.Body,
					CreatedAt: lo.FromPtr(n.CreatedAt),
				})
			}
		}
		if resp.NextPage == 0 {
			break
		}
		discOpts.Page = resp.NextPage
	}

	return all, nil
}

func (c *gitLabClient) ciChecks(ctx context.Context, projectPath, sha string) ([]CICheck, error) {
	pipelineOpts := &gogitlab.ListProjectPipelinesOptions{
		SHA:         &sha,
		ListOptions: gogitlab.ListOptions{PerPage: 10},
	}
	pipelines, _, err := c.gl.Pipelines.ListProjectPipelines(projectPath, pipelineOpts, gogitlab.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("list pipelines: %w", err)
	}

	var all []CICheck
	for _, p := range pipelines {
		jobs, _, err := c.gl.Jobs.ListPipelineJobs(projectPath, int64(p.ID), &gogitlab.ListJobsOptions{ListOptions: gogitlab.ListOptions{PerPage: 100}}, gogitlab.WithContext(ctx))
		if err != nil {
			return nil, fmt.Errorf("list pipeline jobs for pipeline %d: %w", p.ID, err)
		}
		for _, j := range jobs {
			conclusion := ""
			switch j.Status {
			case CICheckConclusionSuccess, gitlabJobStatusFailed, gitlabJobStatusCanceled, CICheckConclusionSkipped:
				conclusion = j.Status
			}
			all = append(all, CICheck{
				Name:       j.Name,
				Status:     j.Status,
				Conclusion: conclusion,
				CheckRunID: j.ID,
			})
		}
	}
	return all, nil
}

func (c *gitLabClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	projectPath, _, err := parseGitLabMRURL(prURL)
	if err != nil {
		return "", err
	}

	reader, resp, err := c.gl.Jobs.GetTraceFile(projectPath, checkRunID, gogitlab.WithContext(ctx))
	if err != nil {
		return "", fmt.Errorf("get job trace for job %d: %w", checkRunID, err)
	}
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
	}
	raw, err := io.ReadAll(io.LimitReader(reader, 512*1024))
	if err != nil {
		return "", fmt.Errorf("read job trace: %w", err)
	}
	return string(raw), nil
}

// ReactToComment adds a GitLab award emoji to an MR note.
func (c *gitLabClient) ReactToComment(ctx context.Context, prURL string, reactableID string, state CommentReactState) error {
	projectPath, mrIID, err := parseGitLabMRURL(prURL)
	if err != nil {
		return err
	}

	parts := strings.SplitN(reactableID, ":", 2)
	if len(parts) != 2 {
		return fmt.Errorf("invalid reactableID %q: expected format type:numericID", reactableID)
	}
	noteID, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return fmt.Errorf("invalid comment ID %q: %w", parts[1], err)
	}

	if state == CommentReactStateComplete {
		// Best-effort removal of the "eyes" emoji we previously added.
		_ = c.deleteAwardEmojiOnNote(ctx, projectPath, mrIID, noteID, "eyes")
	}

	emoji := "eyes"
	if state == CommentReactStateComplete {
		emoji = "thumbsup"
	}

	_, _, err = c.gl.AwardEmoji.CreateMergeRequestAwardEmojiOnNote(
		projectPath, mrIID, noteID,
		&gogitlab.CreateAwardEmojiOptions{Name: emoji},
		gogitlab.WithContext(ctx),
	)
	return err
}

// deleteAwardEmojiOnNote removes the first matching emoji from an MR note.
func (c *gitLabClient) deleteAwardEmojiOnNote(ctx context.Context, projectPath string, mrIID, noteID int64, emojiName string) error {
	emojis, _, err := c.gl.AwardEmoji.ListMergeRequestAwardEmojiOnNote(
		projectPath, mrIID, noteID,
		&gogitlab.ListAwardEmojiOptions{},
		gogitlab.WithContext(ctx),
	)
	if err != nil {
		return err
	}
	for _, e := range emojis {
		if e.Name == emojiName {
			_, err = c.gl.AwardEmoji.DeleteMergeRequestAwardEmojiOnNote(
				projectPath, mrIID, noteID, e.ID,
				gogitlab.WithContext(ctx),
			)
			return err
		}
	}
	return nil
}

// parseGitLabMRURL extracts the project path and MR IID from a GitLab MR URL.
func parseGitLabMRURL(prURL string) (string, int64, error) {
	m := gitlabMRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return "", 0, fmt.Errorf("cannot parse GitLab MR URL: %s", prURL)
	}
	mrIID, err := strconv.ParseInt(m[2], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("invalid MR IID in URL %s: %w", prURL, err)
	}
	return m[1], mrIID, nil
}
