// Package mock_rpc contains mocks for gRPC interfaces.
package mock_rpc

//go:generate mockgen.sh -destination "grpc.go" -package "mock_rpc" "google.golang.org/grpc" "ServerStream,ClientStream,ClientConnInterface,ServerTransportStream"

//go:generate mockgen.sh -destination "agent_configuration.go" -package "mock_rpc" "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc" "AgentConfigurationClient,AgentConfiguration_GetConfigurationClient,AgentConfiguration_GetConfigurationServer,ConfigurationWatcherInterface"

//go:generate mockgen.sh -destination "grpctool.go" -package "mock_rpc" "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool" "InboundGrpcToOutboundHttpStream,PoolConn,PoolInterface,ServerErrorReporter"
