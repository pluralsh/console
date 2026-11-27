package block

import (
	"context"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// Identity is the CSI identity service of both plugins.
type Identity struct {
	csi.UnimplementedIdentityServer

	Version    string
	Controller bool
	// Preflight reports whether the provider passed its checks, nil when it did. Nil: no checks.
	Preflight func() error
}

func (i *Identity) GetPluginInfo(context.Context, *csi.GetPluginInfoRequest) (*csi.GetPluginInfoResponse, error) {
	return &csi.GetPluginInfoResponse{Name: DriverName, VendorVersion: i.Version}, nil
}

func (i *Identity) GetPluginCapabilities(context.Context, *csi.GetPluginCapabilitiesRequest) (*csi.GetPluginCapabilitiesResponse, error) {
	resp := &csi.GetPluginCapabilitiesResponse{}
	if i.Controller {
		resp.Capabilities = append(resp.Capabilities, &csi.PluginCapability{
			Type: &csi.PluginCapability_Service_{Service: &csi.PluginCapability_Service{Type: csi.PluginCapability_Service_CONTROLLER_SERVICE}},
		})
	}
	return resp, nil
}

func (i *Identity) Probe(context.Context, *csi.ProbeRequest) (*csi.ProbeResponse, error) {
	if err := i.Ready(); err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "not ready: %v", err)
	}
	return &csi.ProbeResponse{Ready: wrapperspb.Bool(true)}, nil
}

// Ready reports whether the provider passed its checks, nil when it did.
func (i *Identity) Ready() error {
	if i.Preflight != nil {
		return i.Preflight()
	}
	return nil
}
