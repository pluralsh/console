package scm

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const bbCloudAPIBase = "https://api.bitbucket.org/2.0"

// Cloud:  https://bitbucket.org/{workspace}/{repo}/pull-requests/{id}
var bbCloudPRPattern = regexp.MustCompile(`bitbucket\.org/([^/]+)/([^/]+)/pull-requests?/(\d+)`)

// Data Center / Server:  https://{host}/projects/{PROJECT}/repos/{repo}/pull-requests/{id}
var bbDCPRPattern = regexp.MustCompile(`/projects/([^/]+)/repos/([^/]+)/pull-requests?/(\d+)`)

// newBitBucketClient returns a Cloud or Data Center client based on the host.
func newBitBucketClient(token, host string) Client {
	if host == "bitbucket.org" {
		return &bitBucketCloudClient{token: token}
	}
	return &bitBucketDCClient{
		token:   token,
		baseURL: fmt.Sprintf("https://%s/rest", host),
	}
}

type bitBucketCloudClient struct {
	token string
}

type bbCloudPR struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	State       string `json:"state"` // OPEN, MERGED, DECLINED, SUPERSEDED
	Source      struct {
		Branch struct {
			Name string `json:"name"`
		} `json:"branch"`
		Commit struct {
			Hash string `json:"hash"`
		} `json:"commit"`
	} `json:"source"`
}

type bbCloudComment struct {
	ID      int64 `json:"id"`
	Content struct {
		Raw string `json:"raw"`
	} `json:"content"`
	// The API returns the comment author under "user", not "author".
	User struct {
		Nickname string `json:"nickname"`
	} `json:"user"`
	CreatedOn string `json:"created_on"` // ISO 8601
	Inline    *struct {
		Path string `json:"path"`
	} `json:"inline"` // non-null → inline diff comment
	Deleted bool `json:"deleted"`
}

type bbCloudBuildStatus struct {
	Key   string `json:"key"`
	Name  string `json:"name"`
	State string `json:"state"` // INPROGRESS, SUCCESSFUL, FAILED, STOPPED
	URL   string `json:"url"`
}

func (c *bitBucketCloudClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	workspace, repo, prID, err := parseCloudPRURL(prURL)
	if err != nil {
		return nil, err
	}
	var pr bbCloudPR
	if err := c.get(ctx, fmt.Sprintf("%s/repositories/%s/%s/pullrequests/%d", bbCloudAPIBase, workspace, repo, prID), &pr); err != nil {
		return nil, fmt.Errorf("get PR: %w", err)
	}
	comments, err := c.allComments(ctx, workspace, repo, prID)
	if err != nil {
		return nil, err
	}
	checks, err := c.ciChecks(ctx, workspace, repo, pr.Source.Commit.Hash)
	if err != nil {
		return nil, err
	}
	return &PRDetails{
		Title:    pr.Title,
		Body:     pr.Description,
		HeadRef:  pr.Source.Branch.Name,
		State:    bbCloudState(pr.State),
		Comments: comments,
		CIChecks: checks,
	}, nil
}

func (c *bitBucketCloudClient) allComments(ctx context.Context, workspace, repo string, prID int64) ([]PRComment, error) {
	u := fmt.Sprintf("%s/repositories/%s/%s/pullrequests/%d/comments?pagelen=100", bbCloudAPIBase, workspace, repo, prID)
	var all []PRComment
	for u != "" {
		var page struct {
			Values []bbCloudComment `json:"values"`
			Next   string           `json:"next"`
		}
		if err := c.get(ctx, u, &page); err != nil {
			return nil, fmt.Errorf("list PR comments: %w", err)
		}
		for _, cm := range page.Values {
			if cm.Deleted {
				continue
			}
			cType := PRCommentTypeIssue
			if cm.Inline != nil {
				cType = PRCommentTypeReview
			}
			all = append(all, PRComment{
				ID:        strconv.FormatInt(cm.ID, 10),
				Type:      cType,
				Author:    cm.User.Nickname,
				Body:      cm.Content.Raw,
				CreatedAt: parseBBCloudTime(cm.CreatedOn),
			})
		}
		u = page.Next
	}
	return all, nil
}

func (c *bitBucketCloudClient) ciChecks(ctx context.Context, workspace, repo, sha string) ([]CICheck, error) {
	u := fmt.Sprintf("%s/repositories/%s/%s/commit/%s/statuses?pagelen=100", bbCloudAPIBase, workspace, repo, sha)
	var all []CICheck
	for u != "" {
		var page struct {
			Values []bbCloudBuildStatus `json:"values"`
			Next   string               `json:"next"`
		}
		if err := c.get(ctx, u, &page); err != nil {
			return nil, fmt.Errorf("list build statuses: %w", err)
		}
		for _, s := range page.Values {
			status, conclusion := bbBuildStateToCheck(s.State)
			all = append(all, CICheck{
				Name:       s.Name,
				Status:     status,
				Conclusion: conclusion,
				CheckRunID: bbHashKey(s.Key),
			})
		}
		u = page.Next
	}
	return all, nil
}

func (c *bitBucketCloudClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	workspace, repo, prID, err := parseCloudPRURL(prURL)
	if err != nil {
		return "", err
	}
	var pr bbCloudPR
	if err := c.get(ctx, fmt.Sprintf("%s/repositories/%s/%s/pullrequests/%d", bbCloudAPIBase, workspace, repo, prID), &pr); err != nil {
		return "", fmt.Errorf("get PR: %w", err)
	}
	u := fmt.Sprintf("%s/repositories/%s/%s/commit/%s/statuses?pagelen=100", bbCloudAPIBase, workspace, repo, pr.Source.Commit.Hash)
	for u != "" {
		var page struct {
			Values []bbCloudBuildStatus `json:"values"`
			Next   string               `json:"next"`
		}
		if err := c.get(ctx, u, &page); err != nil {
			return "", fmt.Errorf("list build statuses: %w", err)
		}
		for _, s := range page.Values {
			if bbHashKey(s.Key) == checkRunID && s.URL != "" {
				return fmt.Sprintf("Logs available at: %s", s.URL), nil
			}
		}
		u = page.Next
	}
	return "", fmt.Errorf("no logs found for check run %d", checkRunID)
}

// ReactToComment is a no-op for Bitbucket Cloud which has no emoji reaction API.
func (c *bitBucketCloudClient) ReactToComment(_ context.Context, _ string, _ string, _ CommentReactState) error {
	return nil
}

func (c *bitBucketCloudClient) get(ctx context.Context, u string, out any) error {
	return bbGet(ctx, c.token, u, out)
}

func parseCloudPRURL(prURL string) (workspace, repo string, prID int64, err error) {
	m := bbCloudPRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return "", "", 0, fmt.Errorf("cannot parse Bitbucket Cloud PR URL: %s", prURL)
	}
	id, err := strconv.ParseInt(m[3], 10, 64)
	if err != nil {
		return "", "", 0, fmt.Errorf("invalid PR ID in URL %s: %w", prURL, err)
	}
	return m[1], m[2], id, nil
}

func bbCloudState(s string) PRState {
	switch s {
	case "MERGED":
		return PRStateMerged
	case "DECLINED", "SUPERSEDED":
		return PRStateClosed
	default:
		return PRStateOpen
	}
}

func parseBBCloudTime(s string) time.Time {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

type bitBucketDCClient struct {
	token   string // Bearer token or "email:token"
	baseURL string // e.g. https://bitbucket.company.com/rest
}

// bbDCPage is the standard DC paginated response envelope.
// Pagination uses ?start={nextPageStart} instead of a Next URL.
type bbDCPage[T any] struct {
	IsLastPage    bool `json:"isLastPage"`
	NextPageStart int  `json:"nextPageStart"`
	Values        []T  `json:"values"`
}

type bbDCPR struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	State       string `json:"state"` // OPEN, MERGED, DECLINED, SUPERSEDED
	FromRef     struct {
		DisplayId    string `json:"displayId"`
		LatestCommit string `json:"latestCommit"`
	} `json:"fromRef"`
}

type bbDCComment struct {
	ID     int64  `json:"id"`
	Text   string `json:"text"`
	Author struct {
		Slug string `json:"slug"`
	} `json:"author"`
	CreatedDate   int64 `json:"createdDate"` // Unix milliseconds
	CommentAnchor *struct {
		Path string `json:"path"`
	} `json:"commentAnchor"` // non-null
}

type bbDCBuildStatus struct {
	State string `json:"state"` // INPROGRESS, SUCCESSFUL, FAILED
	Key   string `json:"key"`
	Name  string `json:"name"`
	URL   string `json:"url"`
}

func (c *bitBucketDCClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	project, repo, prID, err := parseDCPRURL(prURL)
	if err != nil {
		return nil, err
	}
	var pr bbDCPR
	if err := c.get(ctx, fmt.Sprintf("%s/api/1.0/projects/%s/repos/%s/pull-requests/%d", c.baseURL, project, repo, prID), &pr); err != nil {
		return nil, fmt.Errorf("get PR: %w", err)
	}
	comments, err := c.allComments(ctx, project, repo, prID)
	if err != nil {
		return nil, err
	}
	checks, err := c.ciChecks(ctx, pr.FromRef.LatestCommit)
	if err != nil {
		return nil, err
	}
	return &PRDetails{
		Title:    pr.Title,
		Body:     pr.Description,
		HeadRef:  pr.FromRef.DisplayId,
		State:    bbDCState(pr.State),
		Comments: comments,
		CIChecks: checks,
	}, nil
}

func (c *bitBucketDCClient) allComments(ctx context.Context, project, repo string, prID int64) ([]PRComment, error) {
	var all []PRComment
	start := 0
	for {
		u := fmt.Sprintf("%s/api/1.0/projects/%s/repos/%s/pull-requests/%d/comments?limit=100&start=%d",
			c.baseURL, project, repo, prID, start)
		var page bbDCPage[bbDCComment]
		if err := c.get(ctx, u, &page); err != nil {
			return nil, fmt.Errorf("list PR comments: %w", err)
		}
		for _, cm := range page.Values {
			cType := PRCommentTypeIssue
			if cm.CommentAnchor != nil {
				cType = PRCommentTypeReview
			}
			all = append(all, PRComment{
				ID:        strconv.FormatInt(cm.ID, 10),
				Type:      cType,
				Author:    cm.Author.Slug,
				Body:      cm.Text,
				CreatedAt: time.UnixMilli(cm.CreatedDate).UTC(),
			})
		}
		if page.IsLastPage {
			break
		}
		start = page.NextPageStart
	}
	return all, nil
}

func (c *bitBucketDCClient) ciChecks(ctx context.Context, sha string) ([]CICheck, error) {
	var all []CICheck
	start := 0
	for {
		u := fmt.Sprintf("%s/build-status/1.0/commits/%s?limit=100&start=%d", c.baseURL, sha, start)
		var page bbDCPage[bbDCBuildStatus]
		if err := c.get(ctx, u, &page); err != nil {
			return nil, fmt.Errorf("list build statuses: %w", err)
		}
		for _, s := range page.Values {
			status, conclusion := bbBuildStateToCheck(s.State)
			all = append(all, CICheck{
				Name:       s.Name,
				Status:     status,
				Conclusion: conclusion,
				CheckRunID: bbHashKey(s.Key),
			})
		}
		if page.IsLastPage {
			break
		}
		start = page.NextPageStart
	}
	return all, nil
}

func (c *bitBucketDCClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	project, repo, prID, err := parseDCPRURL(prURL)
	if err != nil {
		return "", err
	}
	var pr bbDCPR
	if err := c.get(ctx, fmt.Sprintf("%s/api/1.0/projects/%s/repos/%s/pull-requests/%d", c.baseURL, project, repo, prID), &pr); err != nil {
		return "", fmt.Errorf("get PR: %w", err)
	}
	start := 0
	for {
		u := fmt.Sprintf("%s/build-status/1.0/commits/%s?limit=100&start=%d", c.baseURL, pr.FromRef.LatestCommit, start)
		var page bbDCPage[bbDCBuildStatus]
		if err := c.get(ctx, u, &page); err != nil {
			return "", fmt.Errorf("list build statuses: %w", err)
		}
		for _, s := range page.Values {
			if bbHashKey(s.Key) == checkRunID && s.URL != "" {
				return fmt.Sprintf("Logs available at: %s", s.URL), nil
			}
		}
		if page.IsLastPage {
			break
		}
		start = page.NextPageStart
	}
	return "", fmt.Errorf("no logs found for check run %d", checkRunID)
}

// ReactToComment is a no-op for Bitbucket DC which has no emoji reaction API.
func (c *bitBucketDCClient) ReactToComment(_ context.Context, _ string, _ string, _ CommentReactState) error {
	return nil
}

func (c *bitBucketDCClient) get(ctx context.Context, u string, out any) error {
	return bbGet(ctx, c.token, u, out)
}

func parseDCPRURL(prURL string) (project, repo string, prID int64, err error) {
	m := bbDCPRPattern.FindStringSubmatch(prURL)
	if m == nil {
		return "", "", 0, fmt.Errorf("cannot parse Bitbucket Data Center PR URL: %s", prURL)
	}
	id, err := strconv.ParseInt(m[3], 10, 64)
	if err != nil {
		return "", "", 0, fmt.Errorf("invalid PR ID in URL %s: %w", prURL, err)
	}
	return m[1], m[2], id, nil
}

func bbDCState(s string) PRState {
	switch s {
	case "MERGED":
		return PRStateMerged
	case "DECLINED", "SUPERSEDED":
		return PRStateClosed
	default:
		return PRStateOpen
	}
}

// bbGet performs an authenticated GET and JSON-decodes the response body.
// Supports Bearer tokens and "username:password" Basic auth.
func bbGet(ctx context.Context, token, u string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	if strings.Contains(token, ":") {
		parts := strings.SplitN(token, ":", 2)
		req.SetBasicAuth(parts[0], parts[1])
	} else {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, body)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// bbHashKey maps a Bitbucket build status key to a stable int64 via FNV-64a.
func bbHashKey(key string) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(key))
	return int64(h.Sum64())
}

// bbBuildStateToCheck maps INPROGRESS/SUCCESSFUL/FAILED/STOPPED → (status, conclusion).
func bbBuildStateToCheck(state string) (status, conclusion string) {
	switch state {
	case "SUCCESSFUL":
		return CICheckStatusCompleted, CICheckConclusionSuccess
	case "FAILED":
		return CICheckStatusCompleted, "failed"
	case "STOPPED":
		return CICheckStatusCompleted, "canceled"
	default: // INPROGRESS
		return CICheckStatusInProgress, ""
	}
}
