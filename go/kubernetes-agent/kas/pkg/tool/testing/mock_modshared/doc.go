package mock_modshared

//go:generate mockgen.sh -destination "api.go" -package "mock_modshared" "github.com/pluralsh/kubernetes-agent/pkg/module/modshared" "RpcApi,Api"
