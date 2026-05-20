package scm

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/pluralsh/console/go/deployment-operator/internal/proto/scm"
)

const envGitAccessToken = "GIT_ACCESS_TOKEN"

type GRPCClient interface {
	GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error)
	Close() error
}

type grpcClient struct {
	conn   *grpc.ClientConn
	client pb.ScmServiceClient
}

func NewGRPCClient(address string) (GRPCClient, error) {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect scm grpc client: %w", err)
	}

	return &grpcClient{
		conn:   conn,
		client: pb.NewScmServiceClient(conn),
	}, nil
}

func (in *grpcClient) Close() error {
	if in == nil || in.conn == nil {
		return nil
	}

	return in.conn.Close()
}

func (in *grpcClient) GetPRDetails(ctx context.Context, prURL string) (*PRDetails, error) {
	resp, err := in.client.GetPRDetails(ctx, &pb.GetPRDetailsRequest{PrUrl: prURL})
	if err != nil {
		return nil, err
	}

	return in.fromGrpcPrDetails(resp)
}

func (in *grpcClient) fromGrpcPrDetails(resp *pb.GetPRDetailsResponse) (*PRDetails, error) {
	if resp == nil || resp.Details == nil {
		return nil, fmt.Errorf("missing PR details in response")
	}

	pr := resp.Details
	out := &PRDetails{
		Title:   pr.GetTitle(),
		Body:    pr.GetBody(),
		HeadRef: pr.GetHeadRef(),
		State:   PRState(pr.GetState()),
	}

	for _, c := range pr.GetComments() {
		out.Comments = append(out.Comments, PRComment{
			ID:        c.GetId(),
			Type:      PRCommentType(c.GetType()),
			Author:    c.GetAuthor(),
			Body:      c.GetBody(),
			CreatedAt: time.Unix(c.GetCreatedAtUnix(), 0).UTC(),
		})
	}

	for _, check := range pr.GetCiChecks() {
		out.CIChecks = append(out.CIChecks, CICheck{
			Name:       check.GetName(),
			Status:     check.GetStatus(),
			Conclusion: check.GetConclusion(),
			CheckRunID: check.GetCheckRunId(),
		})
	}

	return out, nil
}
