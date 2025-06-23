package server

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/samber/lo"
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
func (in *CloudQueryService) Query(_ context.Context, input *cloudquery.QueryInput) (*cloudquery.QueryResult, error) {
	provider, err := in.toProvider(input.GetConnection())
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return nil, status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, input.GetConnection())
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
	provider, err := in.toProvider(input.GetConnection())
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return nil, status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, input.GetConnection())
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to create connection configuration")
		return nil, status.Errorf(codes.InvalidArgument, "failed to create connection configuration: %v", err)
	}

	c, err := in.pool.Connect(configuration)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
		return nil, status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
	}

	return in.handleSchema(c, input.GetTable())
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

func (in *CloudQueryService) toProvider(conn *cloudquery.Connection) (config.Provider, error) {
	if conn == nil {
		return config.ProviderUnknown, status.Errorf(codes.InvalidArgument, "connection is required")
	}

	switch config.Provider(strings.ToLower(conn.GetProvider())) {
	case config.ProviderAWS:
		return config.ProviderAWS, nil
	case config.ProviderAzure:
		return config.ProviderAzure, nil
	case config.ProviderGCP:
		return config.ProviderGCP, nil
	default:
		return config.ProviderUnknown, fmt.Errorf("unsupported provider: %s", conn.GetProvider())
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
		return config.NewAzureConfiguration(
			config.WithAzureSubscriptionId(connection.GetAzure().GetSubscriptionId()),
			config.WithAzureTenantId(connection.GetAzure().GetTenantId()),
			config.WithAzureClientId(connection.GetAzure().GetClientId()),
			config.WithAzureClientSecret(connection.GetAzure().GetClientSecret()),
		), nil
	case config.ProviderGCP:
		return config.NewGCPConfiguration(
			config.WithGCPServiceAccountJSON(connection.GetGcp().GetServiceAccountJson()),
		), nil
	default:
		return c, fmt.Errorf("unsupported provider: %s", provider)
	}
}

func (in *CloudQueryService) handleQuery(c connection.Connection, query string) (*cloudquery.QueryResult, error) {
	columns, rows, err := c.Query(query)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute query '%s': %v", query, err)
	}
	klog.V(log.LogLevelDebug).InfoS("found query results", "rows", len(rows))

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		rowMap := make(map[string]any)
		for i, col := range columns {
			rowMap[col] = in.formatValue(row[i])
		}

		result = append(result, rowMap)
	}

	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to marshal query result for '%s': %v", query, err)
	}

	fmt.Println(string(resultJSON))

	return &cloudquery.QueryResult{Result: string(resultJSON)}, nil
}

func (in *CloudQueryService) handleSchema(c connection.Connection, table string) (*cloudquery.SchemaOutput, error) {
	result, err := c.Schema(table)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to execute schema query", "table", table)
		return nil, status.Errorf(codes.Internal, "failed to execute schema query '%s': %v", table, err)
	}

	return &cloudquery.SchemaOutput{Result: lo.ToSlicePtr(result)}, nil
}

func (in *CloudQueryService) formatValue(value any) any {
	switch v := value.(type) {
	case []byte:
		return string(v)
	default:
		return value
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

	ec2Output.Result = ""

	ec2Output.Links = []string{"aws_vpc", "aws_subnet"}

	if err := stream.Send(ec2Output); err != nil {
		return err
	}

	// S3 bucket extract
	s3Output := &cloudquery.ExtractOutput{
		Type: "aws_s3_bucket",
		Id:   "my-app-logs",
	}

	s3Output.Result = ""

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

	vmOutput.Result = ""

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

	instanceOutput.Result = ""

	instanceOutput.Links = []string{"gcp_disk", "gcp_network"}

	return stream.Send(instanceOutput)
}
