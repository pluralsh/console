package scm

import (
	"context"
	"fmt"
	"io"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/microsoft/azure-devops-go-api/azuredevops/v7"
	adobuild "github.com/microsoft/azure-devops-go-api/azuredevops/v7/build"
	adogit "github.com/microsoft/azure-devops-go-api/azuredevops/v7/git"
	"github.com/samber/lo"
)

// https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}
var adoPRPatternDevAzure = regexp.MustCompile(`(?i)dev\.azure\.com/([^/]+)/([^/]+)/_git/([^/?#]+)/pullrequest/(\d+)`)

// https://{org}.visualstudio.com/{project}/_git/{repo}/pullrequest/{id}
var adoPRPatternVSO = regexp.MustCompile(`(?i)([^/.]+)\.visualstudio\.com/([^/]+)/_git/([^/?#]+)/pullrequest/(\d+)`)

// adoParsedURL holds the fields extracted from an Azure DevOps PR URL.
type adoParsedURL struct {
	org     string
	project string
	repo    string
	prID    int
}

// orgURL returns the organisation-scoped base URL used to create an SDK connection.
func (p adoParsedURL) orgURL() string {
	return fmt.Sprintf("https://dev.azure.com/%s", p.org)
}

// parseADOPRURL extracts org, project, repo and PR ID from both the
// dev.azure.com and *.visualstudio.com URL formats.
func parseADOPRURL(prURL string) (adoParsedURL, error) {
	if m := adoPRPatternDevAzure.FindStringSubmatch(prURL); m != nil {
		prID, err := strconv.Atoi(m[4])
		if err != nil {
			return adoParsedURL{}, fmt.Errorf("invalid PR ID in URL %s: %w", prURL, err)
		}
		return adoParsedURL{org: m[1], project: m[2], repo: m[3], prID: prID}, nil
	}
	if m := adoPRPatternVSO.FindStringSubmatch(prURL); m != nil {
		prID, err := strconv.Atoi(m[4])
		if err != nil {
			return adoParsedURL{}, fmt.Errorf("invalid PR ID in URL %s: %w", prURL, err)
		}
		// visualstudio.com: org is the subdomain, API still lives at dev.azure.com
		return adoParsedURL{org: m[1], project: m[2], repo: m[3], prID: prID}, nil
	}
	return adoParsedURL{}, fmt.Errorf("cannot parse Azure DevOps PR URL: %s", prURL)
}

// azureDevOpsClient implements the SCM Client interface for Azure DevOps.
// It uses a PAT (Personal Access Token) for authentication via the official
// Azure DevOps Go SDK.  If the token is in "username:pat" format the PAT
// portion (after the colon) is extracted and used; otherwise the whole value
// is treated as a bare PAT.
type azureDevOpsClient struct {
	pat string // bare Personal Access Token
}

func newAzureDevOpsClient(token string) *azureDevOpsClient {
	pat := token
	if idx := strings.Index(token, ":"); idx >= 0 {
		pat = token[idx+1:]
	}
	return &azureDevOpsClient{pat: pat}
}

// connection creates an SDK connection scoped to the given organisation URL.
func (c *azureDevOpsClient) connection(orgURL string) *azuredevops.Connection {
	return azuredevops.NewPatConnection(orgURL, c.pat)
}

// gitClient returns an SDK Git client for the given organisation.
func (c *azureDevOpsClient) gitClient(ctx context.Context, orgURL string) (adogit.Client, error) {
	return adogit.NewClient(ctx, c.connection(orgURL))
}

// buildClient returns an SDK Build client for the given organisation.
func (c *azureDevOpsClient) buildClient(ctx context.Context, orgURL string) (adobuild.Client, error) {
	return adobuild.NewClient(ctx, c.connection(orgURL))
}

func (c *azureDevOpsClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	parsed, err := parseADOPRURL(prURL)
	if err != nil {
		return nil, err
	}

	gc, err := c.gitClient(ctx, parsed.orgURL())
	if err != nil {
		return nil, fmt.Errorf("create git client: %w", err)
	}

	pr, err := gc.GetPullRequest(ctx, adogit.GetPullRequestArgs{
		RepositoryId:  &parsed.repo,
		PullRequestId: &parsed.prID,
		Project:       &parsed.project,
	})
	if err != nil {
		return nil, fmt.Errorf("get PR: %w", err)
	}

	comments, err := c.allComments(ctx, gc, parsed)
	if err != nil {
		return nil, err
	}

	sourceRef := lo.FromPtr(pr.SourceRefName)

	checks, err := c.ciChecks(ctx, parsed, sourceRef)
	if err != nil {
		// Build API access is optional — the PAT may not have Build (Read) scope.
		// Log a warning and continue with empty CI checks rather than failing the whole call.
		log.Printf("[azure-devops] warning: could not fetch CI checks (missing Build scope?): %v", err)
		checks = nil
	}

	return &PRDetails{
		Title:    lo.FromPtr(pr.Title),
		Body:     lo.FromPtr(pr.Description),
		HeadRef:  adoBranchName(sourceRef),
		State:    adoPRState(pr.Status),
		Comments: comments,
		CIChecks: checks,
	}, nil
}

func (c *azureDevOpsClient) GetPRSummary(ctx context.Context, prURL string) (*PRDetails, error) {
	parsed, err := parseADOPRURL(prURL)
	if err != nil {
		return nil, err
	}

	gc, err := c.gitClient(ctx, parsed.orgURL())
	if err != nil {
		return nil, fmt.Errorf("create git client: %w", err)
	}

	pr, err := gc.GetPullRequest(ctx, adogit.GetPullRequestArgs{
		RepositoryId:  &parsed.repo,
		PullRequestId: &parsed.prID,
		Project:       &parsed.project,
	})
	if err != nil {
		return nil, fmt.Errorf("get PR: %w", err)
	}

	sourceRef := lo.FromPtr(pr.SourceRefName)
	return &PRDetails{
		Title:   lo.FromPtr(pr.Title),
		Body:    lo.FromPtr(pr.Description),
		HeadRef: adoBranchName(sourceRef),
		State:   adoPRState(pr.Status),
	}, nil
}

func (c *azureDevOpsClient) allComments(ctx context.Context, gc adogit.Client, parsed adoParsedURL) ([]PRComment, error) {
	threads, err := gc.GetThreads(ctx, adogit.GetThreadsArgs{
		RepositoryId:  &parsed.repo,
		PullRequestId: &parsed.prID,
		Project:       &parsed.project,
	})
	if err != nil {
		return nil, fmt.Errorf("get PR threads: %w", err)
	}

	var all []PRComment
	for _, thread := range *threads {
		if thread.IsDeleted != nil && *thread.IsDeleted {
			continue
		}
		inline := thread.ThreadContext != nil
		if thread.Comments == nil {
			continue
		}
		for _, cm := range *thread.Comments {
			if cm.IsDeleted != nil && *cm.IsDeleted {
				continue
			}
			if cm.CommentType != nil && *cm.CommentType == adogit.CommentTypeValues.System {
				continue
			}
			cType := PRCommentTypeIssue
			if inline {
				cType = PRCommentTypeReview
			}
			// Encode both thread ID and comment ID so ReactableID is unique
			threadID := 0
			if thread.Id != nil {
				threadID = *thread.Id
			}
			cmID := 0
			if cm.Id != nil {
				cmID = *cm.Id
			}
			author := ""
			if cm.Author != nil {
				author = lo.FromPtr(cm.Author.UniqueName)
			}
			createdAt := adoTime(cm.PublishedDate)
			all = append(all, PRComment{
				ID:        fmt.Sprintf("%d-%d", threadID, cmID),
				Type:      cType,
				Author:    author,
				Body:      lo.FromPtr(cm.Content),
				CreatedAt: createdAt,
			})
		}
	}
	return all, nil
}

func (c *azureDevOpsClient) ciChecks(ctx context.Context, parsed adoParsedURL, sourceRefName string) ([]CICheck, error) {
	bc, err := c.buildClient(ctx, parsed.orgURL())
	if err != nil {
		return nil, fmt.Errorf("create build client: %w", err)
	}

	top := 100
	reason := adobuild.BuildReasonValues.PullRequest
	args := adobuild.GetBuildsArgs{
		Project:      &parsed.project,
		ReasonFilter: &reason,
		Top:          &top,
	}
	if sourceRefName != "" {
		args.BranchName = &sourceRefName
	}

	resp, err := bc.GetBuilds(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("list PR builds: %w", err)
	}

	var all []CICheck
	for _, b := range resp.Value {
		status, conclusion := adoBuildToCheck(b.Status, b.Result)
		name := ""
		if b.Definition != nil {
			name = lo.FromPtr(b.Definition.Name)
		}
		id := lo.FromPtr(b.Id)
		all = append(all, CICheck{
			Name:       name,
			Status:     status,
			Conclusion: conclusion,
			CheckRunID: int64(id),
		})
	}
	return all, nil
}

// GetCILogs fetches log content for an Azure DevOps build (checkRunID = build ID).
// It concatenates the last few task logs, capped at 512 KB total.
func (c *azureDevOpsClient) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	parsed, err := parseADOPRURL(prURL)
	if err != nil {
		return "", err
	}

	bc, err := c.buildClient(ctx, parsed.orgURL())
	if err != nil {
		return "", fmt.Errorf("create build client: %w", err)
	}

	buildID := int(checkRunID)
	logs, err := bc.GetBuildLogs(ctx, adobuild.GetBuildLogsArgs{
		Project: &parsed.project,
		BuildId: &buildID,
	})
	if err != nil {
		return "", fmt.Errorf("list build logs for build %d: %w", checkRunID, err)
	}
	if logs == nil || len(*logs) == 0 {
		return "", fmt.Errorf("no logs found for build %d", checkRunID)
	}

	entries := *logs

	// Fetch the last ≤3 log entries and concatenate, capped at 512 KB.
	start := len(entries) - 3
	if start < 0 {
		start = 0
	}

	const maxBytes = 512 * 1024
	var sb strings.Builder

	for i := start; i < len(entries); i++ {
		if entries[i].Id == nil {
			continue
		}
		logID := *entries[i].Id
		reader, err := bc.GetBuildLog(ctx, adobuild.GetBuildLogArgs{
			Project: &parsed.project,
			BuildId: &buildID,
			LogId:   &logID,
		})
		if err != nil {
			continue
		}
		remaining := maxBytes - sb.Len()
		if remaining <= 0 {
			_ = reader.Close()
			break
		}
		raw, readErr := io.ReadAll(io.LimitReader(reader, int64(remaining)))
		_ = reader.Close()
		if readErr == nil && len(raw) > 0 {
			sb.Write(raw)
			sb.WriteByte('\n')
		}
	}

	if sb.Len() > 0 {
		return sb.String(), nil
	}

	// Fallback: return the URL of the last log entry.
	if last := entries[len(entries)-1]; last.Url != nil {
		return fmt.Sprintf("Logs available at: %s", *last.Url), nil
	}
	return "", fmt.Errorf("no logs available for build %d", checkRunID)
}

// ReactToComment is a no-op for Azure DevOps, there is no comment reaction API.
func (c *azureDevOpsClient) ReactToComment(_ context.Context, _ string, _ string, _ CommentReactState) error {
	return nil
}

const adoBuildStatusCompleted = CICheckStatusCompleted

// adoBranchName strips the "refs/heads/" prefix from an ADO ref name.
func adoBranchName(ref string) string {
	return strings.TrimPrefix(ref, "refs/heads/")
}

func adoPRState(status *adogit.PullRequestStatus) PRState {
	if status == nil {
		return PRStateOpen
	}
	switch *status {
	case adogit.PullRequestStatusValues.Completed:
		return PRStateMerged
	case adogit.PullRequestStatusValues.Abandoned:
		return PRStateClosed
	default:
		return PRStateOpen
	}
}

// adoBuildToCheck maps Azure DevOps build status/result enums to (status, conclusion).
func adoBuildToCheck(status *adobuild.BuildStatus, result *adobuild.BuildResult) (string, string) {
	if status == nil {
		return "queued", ""
	}
	switch *status {
	case adobuild.BuildStatusValues.Completed:
		if result == nil {
			return adoBuildStatusCompleted, ""
		}
		switch *result {
		case adobuild.BuildResultValues.Succeeded:
			return adoBuildStatusCompleted, CICheckConclusionSuccess
		case adobuild.BuildResultValues.PartiallySucceeded:
			return adoBuildStatusCompleted, CICheckConclusionNeutral
		case adobuild.BuildResultValues.Failed:
			return adoBuildStatusCompleted, CICheckConclusionFailure
		case adobuild.BuildResultValues.Canceled:
			return adoBuildStatusCompleted, CICheckConclusionCancelled
		default:
			return adoBuildStatusCompleted, ""
		}
	case adobuild.BuildStatusValues.InProgress, adobuild.BuildStatusValues.Cancelling:
		return CICheckStatusInProgress, ""
	default: // NotStarted, Postponed
		return CICheckStatusQueued, ""
	}
}

// adoTime safely dereferences an *azuredevops.Time to a time.Time.
func adoTime(t *azuredevops.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return t.Time
}
