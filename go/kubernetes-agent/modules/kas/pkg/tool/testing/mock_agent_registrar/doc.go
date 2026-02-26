package mock_agent_registrar

//go:generate mockgen.sh -destination "agent_registrar.go" -package "mock_agent_registrar" "github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc" "AgentRegistrarClient"
