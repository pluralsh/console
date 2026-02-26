package mock_usage_metrics

//go:generate mockgen.sh -destination "tool.go" "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/usage_metrics" "UsageTrackerInterface,Counter,UniqueCounter"
