package server

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/anypb"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
)

// CloudQueryServer implements the proto.CloudQueryServer interface
type CloudQueryServer struct {
	proto.UnimplementedCloudQueryServer
}

// NewCloudQueryServer creates a new instance of the CloudQuery server
func NewCloudQueryServer() Route {
	return &CloudQueryServer{}
}

// Install registers the CloudQuery service with the gRPC server
func (in *CloudQueryServer) Install(server *grpc.Server) {
	klog.V(log.LogLevelVerbose).InfoS("registering server", "server", "CloudQueryServer")
	proto.RegisterCloudQueryServer(server, in)
}

// Query implements the proto.CloudQueryServer interface
func (in *CloudQueryServer) Query(input *proto.QueryInput, stream grpc.ServerStreamingServer[proto.QueryOutput]) error {
	// Log the request
	provider := "unknown"
	if input.Connection != nil {
		provider = input.Connection.GetProvider()
	}

	klog.V(log.LogLevelDebug).InfoS("received query request", "provider", provider, "input", input)

	// Generate some mock query results based on the input query
	// For demonstration purposes, we'll return different results based on the provider
	switch strings.ToLower(provider) {
	case "aws":
		return handleAWSQuery(input, stream)
	case "azure":
		return handleAzureQuery(input, stream)
	case "gcp":
		return handleGCPQuery(input, stream)
	default:
		return handleDefaultQuery(input, stream)
	}
}

// Schema implements the proto.CloudQueryServer interface
func (in *CloudQueryServer) Schema(input *proto.SchemaInput, stream grpc.ServerStreamingServer[proto.SchemaOutput]) error {
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
		return handleDefaultSchema(input, stream)
	}
}

// Extract implements the proto.CloudQueryServer interface
func (in *CloudQueryServer) Extract(input *proto.ExtractInput, stream grpc.ServerStreamingServer[proto.ExtractOutput]) error {
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
		return handleDefaultExtract(input, stream)
	}
}

// AWS query handler
func handleAWSQuery(input *proto.QueryInput, stream grpc.ServerStreamingServer[proto.QueryOutput]) error {
	// Mock AWS query results
	if strings.Contains(strings.ToLower(input.GetQuery()), "ec2") {
		// EC2 instances mock data
		output := &proto.QueryOutput{
			Columns: []string{"instance_id", "instance_type", "state", "region"},
		}

		// Create mock results map
		result := make(map[string]*anypb.Any)

		// First row
		anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "i-0123456789abcdef0"})
		result["instance_id"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "t2.micro"})
		result["instance_type"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "running"})
		result["state"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-east-1"})
		result["region"] = anyVal

		output.Result = result
		if err := stream.Send(output); err != nil {
			return err
		}

		// Second row with different data
		result = make(map[string]*anypb.Any)
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "i-0987654321fedcba0"})
		result["instance_id"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "t3.small"})
		result["instance_type"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "stopped"})
		result["state"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-west-2"})
		result["region"] = anyVal

		output = &proto.QueryOutput{
			Columns: []string{"instance_id", "instance_type", "state", "region"},
			Result:  result,
		}

		return stream.Send(output)
	} else if strings.Contains(strings.ToLower(input.GetQuery()), "s3") {
		// S3 buckets mock data
		output := &proto.QueryOutput{
			Columns: []string{"bucket_name", "creation_date", "region"},
		}

		// Create mock results map
		result := make(map[string]*anypb.Any)

		// First row
		anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "my-app-logs"})
		result["bucket_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "2023-05-15"})
		result["creation_date"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-east-1"})
		result["region"] = anyVal

		output.Result = result
		if err := stream.Send(output); err != nil {
			return err
		}

		// Second row with different data
		result = make(map[string]*anypb.Any)
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "customer-data-backup"})
		result["bucket_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "2024-02-20"})
		result["creation_date"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "eu-west-1"})
		result["region"] = anyVal

		output = &proto.QueryOutput{
			Columns: []string{"bucket_name", "creation_date", "region"},
			Result:  result,
		}

		return stream.Send(output)
	}

	// Generic AWS response
	return sendGenericQueryResult(stream, "aws_resource")
}

// Azure query handler
func handleAzureQuery(input *proto.QueryInput, stream grpc.ServerStreamingServer[proto.QueryOutput]) error {
	if strings.Contains(strings.ToLower(input.GetQuery()), "vm") {
		// Azure VMs mock data
		output := &proto.QueryOutput{
			Columns: []string{"vm_name", "vm_size", "status", "location"},
		}

		// Create mock results map
		result := make(map[string]*anypb.Any)

		// First row
		anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "web-server-01"})
		result["vm_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "Standard_D2s_v3"})
		result["vm_size"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "running"})
		result["status"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "westeurope"})
		result["location"] = anyVal

		output.Result = result
		if err := stream.Send(output); err != nil {
			return err
		}

		// Second row with different data
		result = make(map[string]*anypb.Any)
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "db-server-01"})
		result["vm_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "Standard_E4s_v3"})
		result["vm_size"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "stopped"})
		result["status"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "eastus"})
		result["location"] = anyVal

		output = &proto.QueryOutput{
			Columns: []string{"vm_name", "vm_size", "status", "location"},
			Result:  result,
		}

		return stream.Send(output)
	}

	// Generic Azure response
	return sendGenericQueryResult(stream, "azure_resource")
}

// GCP query handler
func handleGCPQuery(input *proto.QueryInput, stream grpc.ServerStreamingServer[proto.QueryOutput]) error {
	if strings.Contains(strings.ToLower(input.GetQuery()), "instance") {
		// GCP instances mock data
		output := &proto.QueryOutput{
			Columns: []string{"instance_name", "machine_type", "status", "zone"},
		}

		// Create mock results map
		result := make(map[string]*anypb.Any)

		// First row
		anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "app-server-1"})
		result["instance_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "e2-standard-2"})
		result["machine_type"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "RUNNING"})
		result["status"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-central1-a"})
		result["zone"] = anyVal

		output.Result = result
		if err := stream.Send(output); err != nil {
			return err
		}

		// Second row with different data
		result = make(map[string]*anypb.Any)
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "batch-processor"})
		result["instance_name"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "e2-highmem-4"})
		result["machine_type"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "TERMINATED"})
		result["status"] = anyVal
		anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "europe-west4-c"})
		result["zone"] = anyVal

		output = &proto.QueryOutput{
			Columns: []string{"instance_name", "machine_type", "status", "zone"},
			Result:  result,
		}

		return stream.Send(output)
	}

	// Generic GCP response
	return sendGenericQueryResult(stream, "gcp_resource")
}

// Default query handler
func handleDefaultQuery(input *proto.QueryInput, stream grpc.ServerStreamingServer[proto.QueryOutput]) error {
	return sendGenericQueryResult(stream, "generic_resource")
}

// Helper function to send a generic query result
func sendGenericQueryResult(stream grpc.ServerStreamingServer[proto.QueryOutput], resourcePrefix string) error {
	output := &proto.QueryOutput{
		Columns: []string{"id", "name", "type", "created_at"},
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	// Generate a unique ID
	resourceID := fmt.Sprintf("%s-%s", resourcePrefix, uuid.New().String()[:8])

	anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: resourceID})
	result["id"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: fmt.Sprintf("Mock %s", resourceID)})
	result["name"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "mock-resource"})
	result["type"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "2025-06-12T00:00:00Z"})
	result["created_at"] = anyVal

	output.Result = result

	return stream.Send(output)
}

// AWS schema handler
func handleAWSSchema(input *proto.SchemaInput, stream grpc.ServerStreamingServer[proto.SchemaOutput]) error {
	// AWS EC2 instances table schema
	ec2Schema := &proto.SchemaOutput{
		Table: "aws_ec2_instances",
		Columns: []*proto.SchemaColumn{
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
	s3Schema := &proto.SchemaOutput{
		Table: "aws_s3_buckets",
		Columns: []*proto.SchemaColumn{
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
func handleAzureSchema(input *proto.SchemaInput, stream grpc.ServerStreamingServer[proto.SchemaOutput]) error {
	// Azure VMs table schema
	vmSchema := &proto.SchemaOutput{
		Table: "azure_compute_virtual_machines",
		Columns: []*proto.SchemaColumn{
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
	storageSchema := &proto.SchemaOutput{
		Table: "azure_storage_accounts",
		Columns: []*proto.SchemaColumn{
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
func handleGCPSchema(input *proto.SchemaInput, stream grpc.ServerStreamingServer[proto.SchemaOutput]) error {
	// GCP Compute instances table schema
	computeSchema := &proto.SchemaOutput{
		Table: "gcp_compute_instances",
		Columns: []*proto.SchemaColumn{
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
	storageSchema := &proto.SchemaOutput{
		Table: "gcp_storage_buckets",
		Columns: []*proto.SchemaColumn{
			{Column: "name", Type: "string"},
			{Column: "location", Type: "string"},
			{Column: "storage_class", Type: "string"},
			{Column: "created_at", Type: "timestamp"},
			{Column: "project", Type: "string"},
		},
	}

	return stream.Send(storageSchema)
}

// Default schema handler
func handleDefaultSchema(input *proto.SchemaInput, stream grpc.ServerStreamingServer[proto.SchemaOutput]) error {
	// Generic resources table schema
	genericSchema := &proto.SchemaOutput{
		Table: "generic_resources",
		Columns: []*proto.SchemaColumn{
			{Column: "id", Type: "string"},
			{Column: "name", Type: "string"},
			{Column: "type", Type: "string"},
			{Column: "created_at", Type: "timestamp"},
			{Column: "updated_at", Type: "timestamp"},
		},
	}

	return stream.Send(genericSchema)
}

// AWS extract handler
func handleAWSExtract(input *proto.ExtractInput, stream grpc.ServerStreamingServer[proto.ExtractOutput]) error {
	// Mock AWS resources extraction
	// EC2 instance extract
	ec2Output := &proto.ExtractOutput{
		Type: "aws_ec2_instance",
		Id:   "i-0123456789abcdef0",
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "i-0123456789abcdef0"})
	result["instance_id"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "t2.micro"})
	result["instance_type"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "running"})
	result["state"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-east-1"})
	result["region"] = anyVal

	ec2Output.Result = result
	ec2Output.Links = []string{"aws_vpc", "aws_subnet"}

	if err := stream.Send(ec2Output); err != nil {
		return err
	}

	// S3 bucket extract
	s3Output := &proto.ExtractOutput{
		Type: "aws_s3_bucket",
		Id:   "my-app-logs",
	}

	// Create mock results map
	result = make(map[string]*anypb.Any)

	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "my-app-logs"})
	result["bucket_name"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "2023-05-15"})
	result["creation_date"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-east-1"})
	result["region"] = anyVal

	s3Output.Result = result

	return stream.Send(s3Output)
}

// Azure extract handler
func handleAzureExtract(input *proto.ExtractInput, stream grpc.ServerStreamingServer[proto.ExtractOutput]) error {
	// Mock Azure resources extraction
	// Virtual machine extract
	vmOutput := &proto.ExtractOutput{
		Type: "azure_vm",
		Id:   "web-server-01",
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "web-server-01"})
	result["vm_name"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "Standard_D2s_v3"})
	result["vm_size"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "running"})
	result["status"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "westeurope"})
	result["location"] = anyVal

	vmOutput.Result = result
	vmOutput.Links = []string{"azure_disk", "azure_nic"}

	return stream.Send(vmOutput)
}

// GCP extract handler
func handleGCPExtract(input *proto.ExtractInput, stream grpc.ServerStreamingServer[proto.ExtractOutput]) error {
	// Mock GCP resources extraction
	// Compute instance extract
	instanceOutput := &proto.ExtractOutput{
		Type: "gcp_compute_instance",
		Id:   "app-server-1",
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: "app-server-1"})
	result["instance_name"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "e2-standard-2"})
	result["machine_type"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "RUNNING"})
	result["status"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "us-central1-a"})
	result["zone"] = anyVal

	instanceOutput.Result = result
	instanceOutput.Links = []string{"gcp_disk", "gcp_network"}

	return stream.Send(instanceOutput)
}

// Default extract handler
func handleDefaultExtract(input *proto.ExtractInput, stream grpc.ServerStreamingServer[proto.ExtractOutput]) error {
	// Generic resource extraction
	genericOutput := &proto.ExtractOutput{
		Type: "generic_resource",
		Id:   uuid.New().String(),
	}

	// Create mock results map
	result := make(map[string]*anypb.Any)

	anyVal, _ := anypb.New(&proto.ExtractOutput{Type: "string", Id: genericOutput.Id})
	result["id"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: fmt.Sprintf("Mock Resource %s", genericOutput.Id[:8])})
	result["name"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "mock-resource"})
	result["type"] = anyVal
	anyVal, _ = anypb.New(&proto.ExtractOutput{Type: "string", Id: "2025-06-12T00:00:00Z"})
	result["created_at"] = anyVal

	genericOutput.Result = result

	return stream.Send(genericOutput)
}
