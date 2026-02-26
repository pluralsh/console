package mock_modagent

//go:generate mockgen.sh -destination "api.go" -package "mock_modagent" "github.com/pluralsh/kubernetes-agent/pkg/module/modagent" "Api,Factory,Module"
