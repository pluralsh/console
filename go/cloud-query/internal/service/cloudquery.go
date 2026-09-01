package service

import (
	"encoding/base64"
	"fmt"
	"strconv"
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
	provider, configuration, err := in.providerConfiguration(conn)
	if err != nil {
		return nil, config.ProviderUnknown, err
	}

	c, err := in.pool.Connect(configuration)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
		return nil, config.ProviderUnknown, status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
	}

	return c, provider, nil
}

func (in *CloudQueryService) providerConfiguration(conn *cloudquery.Connection) (config.Provider, config.Configuration, error) {
	provider, err := in.toProvider(conn)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to determine provider from input")
		return config.ProviderUnknown, config.Configuration{}, status.Errorf(codes.InvalidArgument, "failed to determine provider from input: %v", err)
	}

	configuration, err := in.toConnectionConfiguration(provider, conn)
	if err != nil {
		klog.V(log.LogLevelVerbose).ErrorS(err, "failed to create connection configuration")
		return config.ProviderUnknown, config.Configuration{}, status.Errorf(codes.InvalidArgument, "failed to create connection configuration: %v", err)
	}

	return provider, configuration, nil
}

func (in *CloudQueryService) withProviderConnection(conn *cloudquery.Connection, fn func(connection.Connection) error) error {
	provider, configuration, err := in.providerConfiguration(conn)
	if err != nil {
		return err
	}

	run := func() error {
		c, err := in.pool.Connect(configuration)
		if err != nil {
			klog.V(log.LogLevelVerbose).ErrorS(err, "failed to connect to provider", "provider", provider)
			return status.Errorf(codes.Internal, "failed to connect to provider '%s': %v", provider, err)
		}
		return fn(c)
	}

	err = run()
	if err == nil || !pool.IsStaleConnection(err) {
		return err
	}

	klog.ErrorS(err, "stale postgres session for cloud query, recreating", "provider", provider)
	if evictErr := in.pool.Evict(configuration); evictErr != nil {
		klog.ErrorS(evictErr, "failed to evict stale cloud query connection", "provider", provider)
	}
	return run()
}

func wrapInternal(err error, format string, args ...any) error {
	if err == nil {
		return nil
	}
	if _, ok := status.FromError(err); ok {
		return err
	}
	return status.Errorf(codes.Internal, format, args...)
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
	case config.ProviderVSphere:
		return config.ProviderVSphere, nil
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
			config.WithAWSRegions(connection.GetAws().GetRegion()),
			config.WithAWSRegions(connection.GetAws().GetRegions()...),
			config.WithAWSRoleArn(connection.GetAws().GetAssumeRoleArn()),
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

		return config.NewGCPConfiguration(
			config.WithGCPServiceAccountJSON(string(serviceAccountJSON)),
			config.WithGCPProject(connection.GetGcp().GetProject()),
		), nil
	case config.ProviderVSphere:
		opts := []config.Option{
			config.WithVSphereServer(connection.GetVsphere().GetServer()),
			config.WithVSphereUser(connection.GetVsphere().GetUser()),
			config.WithVSpherePassword(connection.GetVsphere().GetPassword()),
		}

		if allowUnverifiedSSL := strings.TrimSpace(connection.GetVsphere().GetAllowUnverifiedSsl()); allowUnverifiedSSL != "" {
			parsed, err := strconv.ParseBool(allowUnverifiedSSL)
			if err != nil {
				return c, fmt.Errorf("failed to parse vSphere allow_unverified_ssl: %w", err)
			}

			opts = append(opts, config.WithVSphereAllowUnverifiedSSL(parsed))
		}

		return config.NewVSphereConfiguration(opts...), nil
	default:
		return c, fmt.Errorf("unsupported provider: %s", provider)
	}
}

// NewCloudQueryService creates a new instance of the CloudQuery server
func NewCloudQueryService(pool *pool.ConnectionPool) Service {
	return &CloudQueryService{pool: pool}
}
