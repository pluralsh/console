package juicefs

import (
	"context"
	"path/filepath"
	"strings"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Mounter mounts one volume's home at a target path and keeps it served until Unmount.
type Mounter interface {
	Mount(ctx context.Context, volumeID, target string, readOnly bool) error
	Unmount(ctx context.Context, target string) error
	Mounted(target string) (bool, error)
}

// Node is the CSI node service. Targets must sit under TargetRoot, where atelet puts actor volumes.
type Node struct {
	csi.UnimplementedNodeServer

	NodeID     string
	TargetRoot string
	Mounter    Mounter
	Log        logr.Logger

	targets keyedLock
}

func (n *Node) NodeGetCapabilities(context.Context, *csi.NodeGetCapabilitiesRequest) (*csi.NodeGetCapabilitiesResponse, error) {
	return &csi.NodeGetCapabilitiesResponse{}, nil
}

func (n *Node) NodeGetInfo(context.Context, *csi.NodeGetInfoRequest) (*csi.NodeGetInfoResponse, error) {
	return &csi.NodeGetInfoResponse{NodeId: n.NodeID}, nil
}

func (n *Node) NodePublishVolume(ctx context.Context, req *csi.NodePublishVolumeRequest) (*csi.NodePublishVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	target, err := n.target(req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	if err := validateCapabilities([]*csi.VolumeCapability{req.GetVolumeCapability()}); err != nil {
		return nil, err
	}

	defer n.targets.lock(target)()
	if ok, err := n.Mounter.Mounted(target); err != nil {
		return nil, status.Errorf(codes.Internal, "checking %s: %v", target, err)
	} else if ok {
		return &csi.NodePublishVolumeResponse{}, nil
	}
	if err := n.Mounter.Mount(ctx, id, target, req.GetReadonly()); err != nil {
		return nil, status.Errorf(codes.Internal, "mounting volume %s at %s: %v", id, target, err)
	}
	n.Log.Info("mounted volume", "volume", id, "target", target)
	return &csi.NodePublishVolumeResponse{}, nil
}

func (n *Node) NodeUnpublishVolume(ctx context.Context, req *csi.NodeUnpublishVolumeRequest) (*csi.NodeUnpublishVolumeResponse, error) {
	target, err := n.target(req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	defer n.targets.lock(target)()
	if err := n.Mounter.Unmount(ctx, target); err != nil {
		return nil, status.Errorf(codes.Internal, "unmounting %s: %v", target, err)
	}
	n.Log.Info("unmounted volume", "volume", req.GetVolumeId(), "target", target)
	return &csi.NodeUnpublishVolumeResponse{}, nil
}

func (n *Node) target(path string) (string, error) {
	if path == "" {
		return "", status.Error(codes.InvalidArgument, "target path is required")
	}
	clean := filepath.Clean(path)
	root := filepath.Clean(n.TargetRoot)
	if !filepath.IsAbs(clean) || !strings.HasPrefix(clean, root+string(filepath.Separator)) {
		return "", status.Errorf(codes.InvalidArgument, "target path %s isn't under %s", path, root)
	}
	return clean, nil
}
