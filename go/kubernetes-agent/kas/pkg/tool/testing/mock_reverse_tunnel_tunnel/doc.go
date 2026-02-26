package mock_reverse_tunnel_tunnel

// This package imports internal/module/reverse_tunnel/tunnel, so it cannot be used in tests in that package
// because of circular imports. Some of the same mocks are generated locally in that package.

//go:generate mockgen.sh -destination "tunnel.go" -package "mock_reverse_tunnel_tunnel" "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel" "Tracker,Handler,FindHandle,Tunnel,PollingQuerier,Finder"
