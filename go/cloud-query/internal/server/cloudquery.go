package server

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/connection"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/pool"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// CloudQueryService implements the cloudquery.CloudQueryServer interface
type CloudQueryService struct {
	cloudquery.UnimplementedCloudQueryServer

	// pool is the connection pool used by the CloudQuery service
	pool *pool.ConnectionPool
}

// NewCloudQueryServer creates a new instance of the CloudQuery server
func NewCloudQueryServer(pool *pool.ConnectionPool) Route {
	return &CloudQueryService{pool: pool}
}

// Install registers the CloudQuery service with the gRPC server
func (in *CloudQueryService) Install(server *grpc.Server) {
	klog.V(log.LogLevelVerbose).InfoS("registering service", "service", "CloudQueryService")
	cloudquery.RegisterCloudQueryServer(server, in)
}

// Query implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Query(_ context.Context, input *cloudquery.QueryInput) (*cloudquery.QueryOutput, error) {
	provider, err := in.toProvider(input)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return nil, status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, input.Connection)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to create connection configuration")
		return nil, status.Errorf(codes.InvalidArgument, "failed to create connection configuration: %v", err)
	}

	c, err := in.pool.Connect(configuration)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
		return nil, status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
	}

	return in.handleQuery(c, input.GetQuery())
}

// Schema implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Schema(_ context.Context, input *cloudquery.SchemaInput) (*cloudquery.SchemaOutput, error) {
	// TODO: implement proper Schema functionality. See Query on how to handle streaming output.

	// Log the request
	provider := "unknown"
	if input.Connection != nil {
		provider = input.Connection.GetProvider()
	}

	klog.V(log.LogLevelDebug).InfoS("received schema request", "provider", provider, "input", input)

	return nil, status.Errorf(codes.Unimplemented, "schema extraction is not implemented for provider: %s", provider)
}

// Extract implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Extract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// TODO: implement proper Extract functionality. See Query on how to handle streaming output.

	// Log the request
	provider := "unknown"
	if input.Connection != nil {
		provider = input.Connection.GetProvider()
	}

	klog.V(log.LogLevelDebug).InfoS("received extract request", "provider", provider, "input", input)

	// Generate some mock extract results based on the provider
	switch strings.ToLower(provider) {
	case "aws":
		return handleAWSExtract(input, stream)
	case "azure":
		return handleAzureExtract(input, stream)
	case "gcp":
		return handleGCPExtract(input, stream)
	default:
		return status.Errorf(codes.InvalidArgument, "unsupported provider: %s", provider)
	}
}

func (in *CloudQueryService) toProvider(input *cloudquery.QueryInput) (config.Provider, error) {
	if input.Connection == nil {
		return config.ProviderUnknown, status.Errorf(codes.InvalidArgument, "connection is required")
	}

	switch config.Provider(strings.ToLower(input.Connection.GetProvider())) {
	case config.ProviderAWS:
		return config.ProviderAWS, nil
	case config.ProviderAzure:
		return config.ProviderAzure, nil
	case config.ProviderGCP:
		return config.ProviderGCP, nil
	default:
		return config.ProviderUnknown, fmt.Errorf("unsupported provider: %s", input.GetConnection().GetProvider())
	}
}

func (in *CloudQueryService) toConnectionConfiguration(provider config.Provider, connection *cloudquery.Connection) (c config.Configuration, err error) {
	switch provider {
	case config.ProviderAWS:
		return config.NewAWSConfiguration(
			config.WithAWSAccessKeyId(connection.GetAws().GetAccessKeyId()),
			config.WithAWSSecretAccessKey(connection.GetAws().GetSecretAccessKey()),
		), nil
	case config.ProviderAzure:
		return config.NewAzureConfiguration(), nil
	case config.ProviderGCP:
		return config.NewGCPConfiguration(), nil
	default:
		return c, fmt.Errorf("unsupported provider: %s", provider)
	}
}

func (in *CloudQueryService) handleQuery(c connection.Connection, query string) (*cloudquery.QueryOutput, error) {
	columns, rows, err := c.Query(query)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to execute query", "query", query)
		return nil, status.Errorf(codes.Internal, "failed to execute query '%s': %v", query, err)
	}
	klog.V(log.LogLevelDebug).InfoS("found query results", "rows", len(rows))

	result := make([]*cloudquery.QueryResult, 0, len(rows))
	for _, row := range rows {
		res := make(map[string]string)
		for i, col := range columns {
			res[col] = in.formatValue(row[i])
		}

		result = append(result, &cloudquery.QueryResult{
			Columns: columns,
			Result:  res,
		})
	}

	return &cloudquery.QueryOutput{
		Result: result,
	}, nil
}

func (in *CloudQueryService) formatValue(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	case bool:
		return fmt.Sprintf("%t", v)
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return fmt.Sprintf("%v", v)
	case time.Time:
		return v.UTC().Format(time.RFC3339Nano)
	case []byte:
		return string(v)
	default:
		jsonData, err := json.Marshal(v)
		if err == nil {
			return string(jsonData)
		}

		return fmt.Sprintf("%v", v)
	}
}

// AWS extract handler
func handleAWSExtract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// Mock AWS resources extraction
	// EC2 instance extract
	ec2Output := &cloudquery.ExtractOutput{
		Type: "aws_ec2_instance",
		Id:   "i-0123456789abcdef0",
	}

	ec2Output.Result = make(map[string]string)

	ec2Output.Links = []string{"aws_vpc", "aws_subnet"}

	if err := stream.Send(ec2Output); err != nil {
		return err
	}

	// S3 bucket extract
	s3Output := &cloudquery.ExtractOutput{
		Type: "aws_s3_bucket",
		Id:   "my-app-logs",
	}

	s3Output.Result = make(map[string]string)

	return stream.Send(s3Output)
}

// Azure extract handler
func handleAzureExtract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// Mock Azure resources extraction
	// Virtual machine extract
	vmOutput := &cloudquery.ExtractOutput{
		Type: "azure_vm",
		Id:   "web-server-01",
	}

	vmOutput.Result = make(map[string]string)

	vmOutput.Links = []string{"azure_disk", "azure_nic"}

	return stream.Send(vmOutput)
}

// GCP extract handler
func handleGCPExtract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// Mock GCP resources extraction
	// Compute instance extract
	instanceOutput := &cloudquery.ExtractOutput{
		Type: "gcp_compute_instance",
		Id:   "app-server-1",
	}

	instanceOutput.Result = make(map[string]string)

	instanceOutput.Links = []string{"gcp_disk", "gcp_network"}

	return stream.Send(instanceOutput)
}
