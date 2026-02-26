package mock_reverse_tunnel_rpc

//go:generate mockgen.sh -destination "rpc.go" -package "mock_reverse_tunnel_rpc" "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc" "ReverseTunnel_ConnectServer,ReverseTunnel_ConnectClient,ReverseTunnelClient"
