package service

import (
	"context"
	"errors"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

// ToolQueryService implements the toolquery.ToolQueryServer interface.
type ToolQueryService struct {
	toolquery.UnimplementedToolQueryServer
}

// Install registers the ToolQuery service with the gRPC server.
func (in *ToolQueryService) Install(server *grpc.Server) {
	klog.V(log.LogLevelVerbose).InfoS("registering service", "service", "ToolQueryService")
	toolquery.RegisterToolQueryServer(server, in)
}

// NewToolQueryService creates a new instance of the ToolQuery server.
func NewToolQueryService() Service {
	return &ToolQueryService{}
}

func (in *ToolQueryService) Metrics(ctx context.Context, input *toolquery.MetricsQueryInput) (*toolquery.MetricsQueryOutput, error) {
	if input == nil || input.GetConnection() == nil {
		return nil, status.Error(codes.InvalidArgument, "connection is required")
	}

	provider, err := tools.NewProvider(input.GetConnection())
	if err != nil {
		return nil, in.mapError("metrics", err)
	}

	output, err := provider.Metrics(ctx, input)
	if err != nil {
		return nil, in.mapError("metrics", err)
	}

	return output, nil
}

func (in *ToolQueryService) Logs(ctx context.Context, input *toolquery.LogsQueryInput) (*toolquery.LogsQueryOutput, error) {
	if input == nil || input.Connection == nil {
		return nil, status.Error(codes.InvalidArgument, "connection is required")
	}

	provider, err := tools.NewProvider(input.GetConnection())
	if err != nil {
		return nil, in.mapError("logs", err)
	}

	output, err := provider.Logs(ctx, input)
	if err != nil {
		return nil, in.mapError("logs", err)
	}

	return output, nil
}

func (in *ToolQueryService) Traces(ctx context.Context, input *toolquery.TracesQueryInput) (*toolquery.TracesQueryOutput, error) {
	if input == nil || input.Connection == nil {
		return nil, status.Error(codes.InvalidArgument, "connection is required")
	}

	provider, err := tools.NewProvider(input.GetConnection())
	if err != nil {
		return nil, in.mapError("traces", err)
	}

	output, err := provider.Traces(ctx, input)
	if err != nil {
		return nil, in.mapError("traces", err)
	}

	return output, nil
}

func (in *ToolQueryService) mapError(operation string, err error) error {
	switch {
	case errors.Is(err, tools.ErrUnsupportedOperation):
		return status.Errorf(codes.Unimplemented, "%s not supported for this provider", operation)
	case errors.Is(err, tools.ErrInvalidArgument):
		return status.Errorf(codes.InvalidArgument, "%s provider error: %v", operation, err)
	default:
		return status.Errorf(codes.Internal, "%s failed: %v", operation, err)
	}
}
