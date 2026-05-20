package scm

import (
	"context"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "github.com/pluralsh/console/go/deployment-operator/internal/proto/scm"
)

func RegisterGRPCServer(registrar grpc.ServiceRegistrar) {
	pb.RegisterScmServiceServer(registrar, &scmGRPCServer{
		tokenProvider: func() string {
			return os.Getenv(envGitAccessToken)
		},
	})
}

type scmGRPCServer struct {
	pb.UnimplementedScmServiceServer

	tokenProvider func() string
}

func (in *scmGRPCServer) GetPRDetails(ctx context.Context, req *pb.GetPRDetailsRequest) (*pb.GetPRDetailsResponse, error) {
	if req == nil || req.GetPrUrl() == "" {
		return nil, status.Error(codes.InvalidArgument, "pr_url is required")
	}

	token := ""
	if in.tokenProvider != nil {
		token = in.tokenProvider()
	}
	if token == "" {
		return nil, status.Error(codes.FailedPrecondition, "GIT_ACCESS_TOKEN is not set; cannot authenticate with SCM provider")
	}

	details, err := NewClient(token).GetPRDetails(ctx, req.GetPrUrl())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch PR details from SCM: %v", err)
	}

	return &pb.GetPRDetailsResponse{Details: in.toGrpcPrDetails(details)}, nil
}

func (in *scmGRPCServer) toGrpcPrDetails(pr *PRDetails) *pb.PRDetails {
	if pr == nil {
		return nil
	}

	out := &pb.PRDetails{
		Title:   pr.Title,
		Body:    pr.Body,
		HeadRef: pr.HeadRef,
		State:   string(pr.State),
	}

	for _, c := range pr.Comments {
		out.Comments = append(out.Comments, &pb.PRComment{
			Id:            c.ID,
			Type:          string(c.Type),
			Author:        c.Author,
			Body:          c.Body,
			CreatedAtUnix: c.CreatedAt.Unix(),
		})
	}

	for _, check := range pr.CIChecks {
		out.CiChecks = append(out.CiChecks, &pb.CICheck{
			Name:       check.Name,
			Status:     check.Status,
			Conclusion: check.Conclusion,
			CheckRunId: check.CheckRunID,
		})
	}

	return out
}
