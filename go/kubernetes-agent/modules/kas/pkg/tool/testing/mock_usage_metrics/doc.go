package mock_usage_metrics

//go:generate mockgen.sh -destination "tool.go" "github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics" "UsageTrackerInterface,Counter,UniqueCounter"
