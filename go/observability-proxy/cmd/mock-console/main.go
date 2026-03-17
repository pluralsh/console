package main

import (
	"context"
	"net"
	"os"

	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/klog/v2"

	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
)

type server struct {
	pb.UnimplementedPluralServerServer
}

const (
	envMockConsoleAddr    = "MOCK_CONSOLE_ADDR"
	envMockPrometheusHost = "MOCK_PROMETHEUS_HOST"
	envMockElasticHost    = "MOCK_ELASTIC_HOST"

	defaultMockConsoleAddr    = ":50051"
	defaultMockPrometheusHost = "http://mock-prometheus:19090/select/default/prometheus"
	defaultMockElasticHost    = "http://mock-elastic:19200"
)

func main() {
	klog.InitFlags(nil)
	defer klog.Flush()

	addr := envOrDefault(envMockConsoleAddr, defaultMockConsoleAddr)

	lis, err := net.Listen("tcp", addr)
	if err != nil {
		klog.Errorf("listen: %v", err)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterPluralServerServer(grpcServer, &server{})

	klog.V(logging.LevelMinimal).Infof("mock console listening on %s", addr)
	if err := grpcServer.Serve(lis); err != nil {
		klog.Errorf("serve grpc: %v", err)
		os.Exit(1)
	}
}

func (s *server) GetAiConfig(context.Context, *pb.AiConfigRequest) (*pb.AiConfig, error) {
	return &pb.AiConfig{Enabled: false}, nil
}

func (s *server) MeterMetrics(context.Context, *pb.MeterMetricsRequest) (*pb.MeterMetricsResponse, error) {
	return &pb.MeterMetricsResponse{Success: true}, nil
}

func (s *server) ProxyAuthentication(context.Context, *pb.ProxyAuthenticationRequest) (*pb.ProxyAuthenticationResponse, error) {
	return &pb.ProxyAuthenticationResponse{Authenticated: true}, nil
}

func (s *server) GetObservabilityConfig(context.Context, *pb.ObservabilityConfigRequest) (*pb.ObservabilityConfig, error) {
	promHost := envOrDefault(envMockPrometheusHost, defaultMockPrometheusHost)

	elasticHost := envOrDefault(envMockElasticHost, defaultMockElasticHost)

	if promHost == "" || elasticHost == "" {
		return nil, status.Error(codes.FailedPrecondition, "mock hosts not configured")
	}

	return &pb.ObservabilityConfig{
		PrometheusHost: &promHost,
		ElasticHost:    &elasticHost,
	}, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
