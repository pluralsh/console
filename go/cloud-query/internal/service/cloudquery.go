package service

import (
	"encoding/base64"
	"fmt"
	"strings"

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

// Install registers the CloudQuery service with the gRPC server.
// Implements the Service interface.
func (in *CloudQueryService) Install(server *grpc.Server) {
	klog.V(log.LogLevelVerbose).InfoS("registering service", "service", "CloudQueryService")
	cloudquery.RegisterCloudQueryServer(server, in)
}

func (in *CloudQueryService) createProviderConnection(conn *cloudquery.Connection) (connection.Connection, config.Provider, error) {
	provider, err := in.toProvider(conn)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return nil, config.ProviderUnknown, status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, conn)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to create connection configuration")
		return nil, config.ProviderUnknown, status.Errorf(codes.InvalidArgument, "failed to create connection configuration: %v", err)
	}

	c, err := in.pool.Connect(configuration)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
		return nil, config.ProviderUnknown, status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
	}

	return c, provider, nil
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
			return c, fmt.Errorf("failed to decode GCP service account JSON: %w", err)
		}

		return config.NewGCPConfiguration(config.WithGCPServiceAccountJSON(string(serviceAccountJSON))), nil
	default:
		return c, fmt.Errorf("unsupported provider: %s", provider)
	}
}

// NewCloudQueryService creates a new instance of the CloudQuery server
func NewCloudQueryService(pool *pool.ConnectionPool) Service {
	return &CloudQueryService{pool: pool}
}
