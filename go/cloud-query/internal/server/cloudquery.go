package server

import (
	"context"
	"encoding/base64"
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
func (in *CloudQueryService) Extract(_ *cloudquery.ExtractInput, _ grpc.ServerStreamingServer[cloudquery.ExtractOutput]) error {
	// TODO: implement proper Extract functionality.
	return status.Errorf(codes.Unimplemented, "extract functionality is not implemented yet")
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
		serviceAccountJSON, err := base64.StdEncoding.DecodeString(connection.GetGcp().GetServiceAccountJsonB64())
		if err != nil {
			return c, fmt.Errorf("failed to decode GCP service account JSON: %v", err)
		}

		return config.NewGCPConfiguration(config.WithGCPServiceAccountJSON(string(serviceAccountJSON))), nil
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
