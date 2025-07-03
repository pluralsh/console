package service

import (
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/extractor"
	"github.com/pluralsh/console/go/cloud-query/internal/extractor/aws"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// Extract implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Extract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	conn, provider, err := in.createProviderConnection(input.GetConnection())
	if err != nil {
		return err
	}

	return in.handleExtract(conn, provider, stream)
}

func (in *CloudQueryService) handleExtract(c connection.Connection, provider config.Provider, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	e, err := in.newExtractor(provider, stream)
	if err != nil {
		return status.Errorf(codes.Unimplemented, "failed to create extractor for provider '%s': %v", provider, err)
	}

	if err = e.Extract(c); err != nil {
		return status.Errorf(codes.Internal, "failed to extract data from provider '%s': %v", provider, err)
	}

	return nil
}

func (in *CloudQueryService) newExtractor(provider config.Provider, sink extractor.Sink) (extractor.Extractor, error) {
	switch provider {
	case config.ProviderAWS:
		return aws.NewAWSExtractor(sink), nil
	default:
		return nil, status.Errorf(codes.Unimplemented, "extractor for provider '%s' is not supported", provider)
	}
}
