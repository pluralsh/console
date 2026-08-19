package scm

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	pb "github.com/pluralsh/console/go/deployment-operator/internal/proto/scm"
)

func TestGRPCCommentLocationRoundTrip(t *testing.T) {
	t.Parallel()

	details := &PRDetails{Comments: []PRComment{{
		ID:        "42",
		Type:      PRCommentTypeReview,
		Author:    "reviewer",
		Body:      "Use the shared helper.",
		CreatedAt: time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC),
		FilePath:  "pkg/auth/session.go",
		StartLine: 12,
		Line:      14,
	}}}

	wireDetails := (&scmGRPCServer{}).toGrpcPrDetails(details)
	roundTripped, err := (&grpcClient{}).fromGrpcPrDetails(&pb.GetPRDetailsResponse{Details: wireDetails})
	require.NoError(t, err)
	require.Len(t, roundTripped.Comments, 1)
	require.Equal(t, "pkg/auth/session.go:12-14", roundTripped.Comments[0].Location())
}
