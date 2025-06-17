package server

import (
	"fmt"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/structpb"
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
func (in *CloudQueryService) Query(input *cloudquery.QueryInput, stream grpc.ServerStreamingServer[cloudquery.QueryOutput]) error {
	provider, err := in.toProvider(input)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, input.Connection)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to create connection configuration")
		return status.Errorf(codes.InvalidArgument, "failed to create connection configuration: %v", err)
	}

	c, err := in.pool.Connect(configuration)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
		return status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
	}

	return in.handleQuery(c, input.GetQuery(), stream)
}

// Schema implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Schema(input *cloudquery.SchemaInput, stream grpc.ServerStreamingServer[cloudquery.SchemaOutput]) error {
	// Log the request
	provider := "unknown"
	if input.Connection != nil {
		provider = input.Connection.GetProvider()
	}

	klog.V(log.LogLevelDebug).InfoS("received schema request", "provider", provider, "input", input)

	// Generate some mock schema results based on the provider
	switch strings.ToLower(provider) {
	case "aws":
		return handleAWSSchema(input, stream)
	case "azure":
		return handleAzureSchema(input, stream)
	case "gcp":
		return handleGCPSchema(input, stream)
	default:
		return status.Errorf(codes.InvalidArgument, "unsupported provider: %s", provider)
	}
}

// Extract implements the cloudquery.CloudQueryServer interface
func (in *CloudQueryService) Extract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
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

func (in *CloudQueryService) handleQuery(c connection.Connection, query string, stream grpc.ServerStreamingServer[cloudquery.QueryOutput]) error {
	columns, rows, err := c.Query(query)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to execute query", "query", query)
		return status.Errorf(codes.Internal, "failed to execute query '%s': %v", query, err)
	}
	klog.V(log.LogLevelDebug).InfoS("found query results", "rows", len(rows))

	output := &cloudquery.QueryOutput{
		Columns: columns,
	}

	if len(rows) == 0 {
		return stream.Send(output)
	}

	for _, row := range rows {
		result := make(map[string]*anypb.Any)
		for i, col := range columns {
			value, err := structpb.NewValue(row[i])
			if err != nil {
				klog.V(log.LogLevelVerbose).ErrorS(err, "failed to convert value to structpb", "column", col, "value", row[i])
				return status.Errorf(codes.Internal, "failed to convert value for column '%s': %v", col, err)
			}

			anyVal, err := anypb.New(value)
			if err != nil {
				klog.V(log.LogLevelVerbose).ErrorS(err, "failed to convert value to anypb", "column", col, "value", row[i])
				return status.Errorf(codes.Internal, "failed to convert value for column '%s': %v", col, err)
			}

			result[col] = anyVal
		}

		output = &cloudquery.QueryOutput{
			Columns: columns,
			Result:  result,
		}

		klog.V(log.LogLevelTrace).InfoS("sending query output", "output", output)
		if err = stream.Send(output); err != nil {
			klog.V(log.LogLevelVerbose).ErrorS(err, "failed to stream query output")
			return status.Errorf(codes.Internal, "failed to send query output: %v", err)
		}
	}

	return nil
}

// AWS schema handler
func handleAWSSchema(input *cloudquery.SchemaInput, stream grpc.ServerStreamingServer[cloudquery.SchemaOutput]) error {
	// AWS EC2 instances table schema
	ec2Schema := &cloudquery.SchemaOutput{
		Table: "aws_ec2_instances",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "instance_id", Type: "string"},
			{Column: "instance_type", Type: "string"},
			{Column: "state", Type: "string"},
			{Column: "region", Type: "string"},
			{Column: "availability_zone", Type: "string"},
			{Column: "launch_time", Type: "timestamp"},
		},
	}

	if err := stream.Send(ec2Schema); err != nil {
		return err
	}

	// AWS S3 buckets table schema
	s3Schema := &cloudquery.SchemaOutput{
		Table: "aws_s3_buckets",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "bucket_name", Type: "string"},
			{Column: "creation_date", Type: "date"},
			{Column: "region", Type: "string"},
			{Column: "owner_id", Type: "string"},
			{Column: "public_access_blocked", Type: "boolean"},
		},
	}

	return stream.Send(s3Schema)
}

// Azure schema handler
func handleAzureSchema(input *cloudquery.SchemaInput, stream grpc.ServerStreamingServer[cloudquery.SchemaOutput]) error {
	// Azure VMs table schema
	vmSchema := &cloudquery.SchemaOutput{
		Table: "azure_compute_virtual_machines",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "vm_name", Type: "string"},
			{Column: "vm_size", Type: "string"},
			{Column: "status", Type: "string"},
			{Column: "location", Type: "string"},
			{Column: "resource_group", Type: "string"},
			{Column: "os_type", Type: "string"},
		},
	}

	if err := stream.Send(vmSchema); err != nil {
		return err
	}

	// Azure Storage accounts table schema
	storageSchema := &cloudquery.SchemaOutput{
		Table: "azure_storage_accounts",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "name", Type: "string"},
			{Column: "location", Type: "string"},
			{Column: "resource_group", Type: "string"},
			{Column: "kind", Type: "string"},
			{Column: "access_tier", Type: "string"},
		},
	}

	return stream.Send(storageSchema)
}

// GCP schema handler
func handleGCPSchema(input *cloudquery.SchemaInput, stream grpc.ServerStreamingServer[cloudquery.SchemaOutput]) error {
	// GCP Compute instances table schema
	computeSchema := &cloudquery.SchemaOutput{
		Table: "gcp_compute_instances",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "instance_name", Type: "string"},
			{Column: "machine_type", Type: "string"},
			{Column: "status", Type: "string"},
			{Column: "zone", Type: "string"},
			{Column: "project_id", Type: "string"},
			{Column: "creation_timestamp", Type: "timestamp"},
		},
	}

	if err := stream.Send(computeSchema); err != nil {
		return err
	}

	// GCP Storage buckets table schema
	storageSchema := &cloudquery.SchemaOutput{
		Table: "gcp_storage_buckets",
		Columns: []*cloudquery.SchemaColumn{
			{Column: "name", Type: "string"},
			{Column: "location", Type: "string"},
			{Column: "storage_class", Type: "string"},
			{Column: "created_at", Type: "timestamp"},
			{Column: "project", Type: "string"},
		},
	}

	return stream.Send(storageSchema)
}

// AWS extract handler
func handleAWSExtract(input *cloudquery.ExtractInput, stream grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// Mock AWS resources extraction
	// EC2 instance extract
	ec2Output := &cloudquery.ExtractOutput{
		Type: "aws_ec2_instance",
		Id:   "i-0123456789abcdef0",
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "i-0123456789abcdef0"})
	result["instance_id"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "t2.micro"})
	result["instance_type"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "running"})
	result["state"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "us-east-1"})
	result["region"] = anyVal

	ec2Output.Result = result
	ec2Output.Links = []string{"aws_vpc", "aws_subnet"}

	if err := stream.Send(ec2Output); err != nil {
		return err
	}

	// S3 bucket extract
	s3Output := &cloudquery.ExtractOutput{
		Type: "aws_s3_bucket",
		Id:   "my-app-logs",
	}

	// Create mock results map
	result = make(map[string]*anypb.Any)

	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "my-app-logs"})
	result["bucket_name"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "2023-05-15"})
	result["creation_date"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "us-east-1"})
	result["region"] = anyVal

	s3Output.Result = result

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

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "web-server-01"})
	result["vm_name"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "Standard_D2s_v3"})
	result["vm_size"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "running"})
	result["status"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "westeurope"})
	result["location"] = anyVal

	vmOutput.Result = result
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

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "app-server-1"})
	result["instance_name"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "e2-standard-2"})
	result["machine_type"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "RUNNING"})
	result["status"] = anyVal
	anyVal, _ = anypb.New(&cloudquery.ExtractOutput{Type: "string", Id: "us-central1-a"})
	result["zone"] = anyVal

	instanceOutput.Result = result
	instanceOutput.Links = []string{"gcp_disk", "gcp_network"}

	return stream.Send(instanceOutput)
}
