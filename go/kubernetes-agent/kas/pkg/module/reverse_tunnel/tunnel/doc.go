package tunnel

//go:generate mockgen.sh -self_package "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel" -destination "mock_for_test.go" -package "tunnel" "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel" "DataCallback,Querier,Tracker"
