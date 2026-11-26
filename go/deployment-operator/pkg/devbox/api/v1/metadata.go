// Package devboxv1 holds the generated devbox.v1 gRPC contract (from proto/devbox/v1 in the repository root,
// regenerate with `make devbox-proto`) plus the metadata conventions shared by console, KAS, devbox-gateway and
// devbox-daemon.
package devboxv1

import (
	"strings"
)

// gRPC metadata keys. Keys are lowercase, as gRPC requires.
const (
	// ClusterIDMetadataKey routes Control calls to a cluster's gateway. On Ingest calls KAS overwrites it with
	// the cluster it verified from the gateway's deploy token.
	ClusterIDMetadataKey = "devbox-cluster-id"
	// InstanceIDMetadataKey and StreamIDMetadataKey are set by KAS on Gateway.ProxyStream from the validated
	// stream token.
	InstanceIDMetadataKey = "devbox-instance-id"
	StreamIDMetadataKey   = "devbox-stream-id"
	// RequestTokenMetadataKey carries the console-signed per-request token the daemon validates.
	RequestTokenMetadataKey = "devbox-request-token"
	// ThreadHeader is the HTTP header the daemon adds to each thread's devbox MCP server entry.
	ThreadHeader = "X-Devbox-Thread"
)

// The daemon streams its browser with voxl (H.264 over a WebSocket) on BrowserStreamPath when the image ships
// voxl, else with x11vnc for noVNC on /browser/vnc. A VNC-kind stream to BrowserStreamPath carries
// BrowserStreamSubprotocol, which tells console to use its voxl client.
const (
	BrowserStreamPath        = "/browser/stream"
	BrowserStreamSubprotocol = "voxl"
)

var (
	controlMethodPrefix = "/" + Control_ServiceDesc.ServiceName + "/"
	gatewayMethodPrefix = "/" + Gateway_ServiceDesc.ServiceName + "/"
)

// GatewayMethodForControl maps a full Control method name, e.g. "/devbox.v1.Control/GetTimeline", to the
// Gateway method KAS forwards it to through the tunnel. It returns false for anything that isn't a Control
// method the Gateway also serves.
func GatewayMethodForControl(fullMethod string) (string, bool) {
	name, ok := strings.CutPrefix(fullMethod, controlMethodPrefix)
	if !ok || !gatewayHasMethod(name) {
		return "", false
	}
	return gatewayMethodPrefix + name, true
}

func gatewayHasMethod(name string) bool {
	for _, m := range Gateway_ServiceDesc.Methods {
		if m.MethodName == name {
			return true
		}
	}
	for _, s := range Gateway_ServiceDesc.Streams {
		if s.StreamName == name {
			return true
		}
	}
	return false
}
