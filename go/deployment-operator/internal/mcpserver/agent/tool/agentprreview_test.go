package tool

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

func TestAgentPrReviewInputSchema(t *testing.T) {
	definition := mcp.NewTool("agentPrReview", mcp.WithInputSchema[AgentPrReviewInputSchema]())

	var schema map[string]any
	require.NoError(t, json.Unmarshal(definition.RawInputSchema, &schema))

	properties := schema["properties"].(map[string]any)
	require.Equal(t, float64(maxReviewComments), properties["comments"].(map[string]any)["maxItems"])
	require.Equal(t, []any{"A", "B", "C", "D", "E", "F"}, properties["confidence"].(map[string]any)["enum"])

	comment := properties["comments"].(map[string]any)["items"].(map[string]any)
	commentProperties := comment["properties"].(map[string]any)
	require.Equal(t, []any{"P0", "P1", "P2", "P3"}, commentProperties["priority"].(map[string]any)["enum"])
	require.ElementsMatch(t, []any{"filename", "line", "title", "body", "priority"}, comment["required"])
}

func TestAgentPrReviewFromRequest(t *testing.T) {
	tool := &AgentPrReview{}
	endLine := int64(14)
	request := reviewRequest([]any{
		map[string]any{
			"filename": "lib/review.go",
			"line":     12,
			"endLine":  endLine,
			"title":    "Unchecked error",
			"body":     "Handle the returned error.",
			"priority": "P1",
		},
	})

	attrs, err := tool.fromRequest(request)
	require.NoError(t, err)
	require.Equal(t, client.AgentReviewConfidenceB, attrs.Confidence)
	require.Equal(t, "lib/review.go", attrs.Files[0].Filename)
	require.Len(t, attrs.Comments, 1)
	require.Equal(t, client.AgentReviewPriorityP1, attrs.Comments[0].Priority)
	require.Equal(t, endLine, *attrs.Comments[0].EndLine)
}

func TestAgentPrReviewRejectsMoreThanThreeComments(t *testing.T) {
	comments := make([]any, maxReviewComments+1)
	for i := range comments {
		comments[i] = map[string]any{
			"filename": "lib/review.go",
			"line":     i + 1,
			"title":    "Finding",
			"body":     "Finding details.",
			"priority": "P2",
		}
	}

	_, err := (&AgentPrReview{}).fromRequest(reviewRequest(comments))
	require.EqualError(t, err, "comments cannot contain more than 3 findings")
}

func TestAgentPrReviewHandler(t *testing.T) {
	consoleClient := mocks.NewClientMock(t)
	consoleClient.EXPECT().
		AgentPrReview(mock.Anything, "run-1", mock.MatchedBy(func(attrs client.AgentPrReviewAttributes) bool {
			return attrs.URL == "https://github.com/pluralsh/console/pull/42" &&
				attrs.Confidence == client.AgentReviewConfidenceB &&
				len(attrs.Comments) == 1
		})).
		Return(&client.PullRequestFragment{
			ID:  "pr-1",
			URL: "https://github.com/pluralsh/console/pull/42",
		}, nil).
		Once()

	reviewTool := NewAgentPrReview(consoleClient, "run-1").(*AgentPrReview)
	result, err := reviewTool.handler(context.Background(), reviewRequest([]any{
		map[string]any{
			"filename": "lib/review.go",
			"line":     12,
			"title":    "Unchecked error",
			"body":     "Handle the returned error.",
			"priority": "P1",
		},
	}))

	require.NoError(t, err)
	require.False(t, result.IsError)
	require.Contains(t, result.Content[0].(mcp.TextContent).Text, `"pullRequestId":"pr-1"`)
}

func reviewRequest(comments []any) mcp.CallToolRequest {
	request := mcp.CallToolRequest{}
	request.Params.Arguments = map[string]any{
		"url":               "https://github.com/pluralsh/console/pull/42",
		"confidence":        "B",
		"summary":           "The change is mostly safe.",
		"confidenceComment": "One finding needs attention.",
		"files": []any{
			map[string]any{
				"filename": "lib/review.go",
				"summary":  "Adds review support.",
			},
		},
		"comments": comments,
	}
	return request
}
