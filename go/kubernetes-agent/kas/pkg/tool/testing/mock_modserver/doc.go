package mock_modserver

//go:generate mockgen.sh -source "../../../module/modserver/api.go" -destination "api.go" -package "mock_modserver"

//go:generate mockgen.sh -destination "rpc_api.go" -package "mock_modserver" "github.com/pluralsh/kubernetes-agent/pkg/module/modserver" "RpcApi,AgentRpcApi"
