package agentkapp

//go:generate mockgen.sh  -destination "mock_for_test.go" -package "agentkapp" "github.com/pluralsh/console/go/kubernetes-agent/cmd/agentk/agentkapp" "Runner,LeaderElector"
