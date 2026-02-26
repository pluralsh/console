package mock_tool

//go:generate mockgen.sh -destination "tool.go" -package "mock_tool" "github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/errz" "ErrReporter"
