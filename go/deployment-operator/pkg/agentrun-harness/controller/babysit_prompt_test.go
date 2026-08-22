package controller

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

func TestBuildBabysitPromptPrioritizesHumanCommentsAndShowsLocation(t *testing.T) {
	t.Parallel()

	prompt := buildBabysitPrompt("feature/review", "", []toolv1.EnrichedPR{{
		URL:     "https://github.com/o/r/pull/1",
		Title:   "Review feedback",
		Details: &scm.PRDetails{},
		NewComments: []scm.PRComment{{
			ID:        "42",
			Type:      scm.PRCommentTypeReview,
			Author:    "reviewer",
			Body:      "Handle this edge case.",
			CreatedAt: time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
			FilePath:  "pkg/auth/session.go",
			StartLine: 12,
			Line:      14,
		}},
	}}, time.Time{})

	for _, expected := range []string{
		"Every human-authored comment below is actionable",
		"prioritize it over resuming the original task",
		"on `pkg/auth/session.go:12-14`",
		"commentId: `review:42`",
	} {
		require.Contains(t, prompt, expected)
	}

	require.NotContains(t, prompt, "reviewId:")
	require.Contains(t, prompt, "Handle this edge case.")
}

func TestBuildBabysitPromptInstructsNotToPushCIFlakes(t *testing.T) {
	t.Parallel()

	prompt := buildBabysitPrompt("feature/review", "", []toolv1.EnrichedPR{{
		URL:   "https://github.com/o/r/pull/1",
		Title: "CI failure",
		Details: &scm.PRDetails{
			CIChecks: []scm.CICheck{{
				Name:       "test",
				Status:     scm.CICheckStatusCompleted,
				Conclusion: scm.CICheckConclusionFailure,
			}},
		},
	}}, time.Time{})

	for _, expected := range []string{
		"Failing CI checks",
		"diagnose before changing code",
		"Do not commit or push",
		"CI flake",
		"transient network",
		"test",
	} {
		require.Contains(t, prompt, expected)
	}

	require.NotContains(t, prompt, "you MUST fix these")
}
