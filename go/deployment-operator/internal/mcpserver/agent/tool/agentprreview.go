package tool

import (
	"context"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/pluralsh/console/go/client"

	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
)

const maxReviewComments = 3

type AgentPrReviewInputSchema struct {
	URL               string                      `json:"url" jsonschema:"required,description=The URL of the pull request being reviewed"`
	Confidence        string                      `json:"confidence" jsonschema:"required,enum=A,enum=B,enum=C,enum=D,enum=E,enum=F,description=The A-F confidence grade"`
	Summary           string                      `json:"summary" jsonschema:"required,description=A summary of the pull request review"`
	ConfidenceComment string                      `json:"confidenceComment" jsonschema:"required,description=An explanation of the confidence grade"`
	Files             []AgentPrReviewFileInput    `json:"files,omitempty" jsonschema:"description=File-level summaries"`
	Comments          []AgentPrReviewCommentInput `json:"comments,omitempty" jsonschema:"maxItems=3,description=Up to three inline review findings"`
}

type AgentPrReviewFileInput struct {
	Filename string `json:"filename" jsonschema:"required,description=The repository-relative filename"`
	Summary  string `json:"summary" jsonschema:"required,description=A summary of the changes to this file"`
}

type AgentPrReviewCommentInput struct {
	Filename string `json:"filename" jsonschema:"required,description=The repository-relative filename"`
	Line     int64  `json:"line" jsonschema:"required,minimum=1,description=The new-file line where the finding begins"`
	EndLine  *int64 `json:"endLine,omitempty" jsonschema:"minimum=1,description=The optional new-file line where the finding ends"`
	Title    string `json:"title" jsonschema:"required,description=The concise title of the inline finding"`
	Body     string `json:"body" jsonschema:"required,description=The detailed inline review comment"`
	Priority string `json:"priority" jsonschema:"required,enum=P0,enum=P1,enum=P2,enum=P3,description=The P0-P3 finding priority"`
}

func (in *AgentPrReview) Install(server *server.MCPServer) {
	server.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithInputSchema[AgentPrReviewInputSchema](),
		),
		in.handler,
	)
}

func (in *AgentPrReview) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	attrs, err := in.fromRequest(request)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not map request to review attributes: %v", err)), nil
	}

	pr, err := in.client.AgentPrReview(ctx, in.agentRunID, attrs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to publish pull request review: %v", err)), nil
	}
	if pr == nil {
		return mcp.NewToolResultError("pull request review returned no pull request"), nil
	}

	return mcp.NewToolResultJSON(struct {
		Success        bool             `json:"success"`
		Message        string           `json:"message"`
		PullRequestID  string           `json:"pullRequestId"`
		PullRequestURL string           `json:"pullRequestUrl"`
		Status         *client.PrStatus `json:"status"`
		Title          *string          `json:"title"`
	}{
		Success:        true,
		Message:        fmt.Sprintf("successfully published review for %s", attrs.URL),
		PullRequestID:  pr.ID,
		PullRequestURL: pr.URL,
		Status:         pr.Status,
		Title:          pr.Title,
	})
}

func (in *AgentPrReview) fromRequest(request mcp.CallToolRequest) (client.AgentPrReviewAttributes, error) {
	var input AgentPrReviewInputSchema
	if err := request.BindArguments(&input); err != nil {
		return client.AgentPrReviewAttributes{}, err
	}

	if err := validateReviewInput(input); err != nil {
		return client.AgentPrReviewAttributes{}, err
	}

	attrs := client.AgentPrReviewAttributes{
		URL:               input.URL,
		Confidence:        client.AgentReviewConfidence(input.Confidence),
		Summary:           input.Summary,
		ConfidenceComment: input.ConfidenceComment,
		Files:             make([]*client.AgentPrReviewFileAttributes, 0, len(input.Files)),
		Comments:          make([]*client.AgentPrReviewCommentAttributes, 0, len(input.Comments)),
	}

	for _, file := range input.Files {
		attrs.Files = append(attrs.Files, &client.AgentPrReviewFileAttributes{
			Filename: file.Filename,
			Summary:  file.Summary,
		})
	}

	for _, comment := range input.Comments {
		attrs.Comments = append(attrs.Comments, &client.AgentPrReviewCommentAttributes{
			Filename: comment.Filename,
			Line:     comment.Line,
			EndLine:  comment.EndLine,
			Title:    comment.Title,
			Body:     comment.Body,
			Priority: client.AgentReviewPriority(comment.Priority),
		})
	}

	return attrs, nil
}

func validateReviewInput(input AgentPrReviewInputSchema) error {
	required := map[string]string{
		"url":               input.URL,
		"confidence":        input.Confidence,
		"summary":           input.Summary,
		"confidenceComment": input.ConfidenceComment,
	}
	for field, value := range required {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("%s is required", field)
		}
	}

	if confidence := client.AgentReviewConfidence(input.Confidence); !confidence.IsValid() {
		return fmt.Errorf("invalid confidence %q", input.Confidence)
	}
	if len(input.Comments) > maxReviewComments {
		return fmt.Errorf("comments cannot contain more than %d findings", maxReviewComments)
	}

	for i, file := range input.Files {
		if strings.TrimSpace(file.Filename) == "" || strings.TrimSpace(file.Summary) == "" {
			return fmt.Errorf("files[%d] requires filename and summary", i)
		}
	}

	for i, comment := range input.Comments {
		if strings.TrimSpace(comment.Filename) == "" ||
			strings.TrimSpace(comment.Title) == "" ||
			strings.TrimSpace(comment.Body) == "" {
			return fmt.Errorf("comments[%d] requires filename, title, and body", i)
		}
		if comment.Line < 1 {
			return fmt.Errorf("comments[%d].line must be greater than zero", i)
		}
		if comment.EndLine != nil && *comment.EndLine < comment.Line {
			return fmt.Errorf("comments[%d].endLine cannot precede line", i)
		}
		if priority := client.AgentReviewPriority(comment.Priority); !priority.IsValid() {
			return fmt.Errorf("invalid comments[%d].priority %q", i, comment.Priority)
		}
	}

	return nil
}

func NewAgentPrReview(client console.Client, agentRunID string) Tool {
	return &AgentPrReview{
		ConsoleTool: ConsoleTool{
			id:          AgentPrReviewTool,
			description: "Publish a normalized pull request review with an A-F confidence grade, file summaries, and up to three prioritized inline findings",
			client:      client,
			agentRunID:  agentRunID,
		},
	}
}
