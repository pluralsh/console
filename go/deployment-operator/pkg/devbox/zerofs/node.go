package zerofs

import (
	"context"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Volume is what staging needs to serve a volume.
type Volume struct {
	ID            string
	CapacityBytes int64
	Owner         Owner
}

// Stager serves a volume's filesystem at a staging path until Unstage. Both are idempotent.
type Stager interface {
	Stage(ctx context.Context, v Volume, staging string) error
	Unstage(ctx context.Context, volumeID, staging string) error
}

// Binder publishes a staged filesystem at a target with a bind mount.
type Binder interface {
	Bind(source, target string, readOnly bool) error
	Unmount(target string) error
	Mounted(path string) (bool, error)
}

// Node is the CSI node service. Staging and publish paths must sit under TargetRoot, where atelet puts both.
type Node struct {
	csi.UnimplementedNodeServer

	NodeID     string
	TargetRoot string
	Stager     Stager
	Binder     Binder
	Log        logr.Logger

	volumes keyedLock
	targets keyedLock
}

func (n *Node) NodeGetCapabilities(context.Context, *csi.NodeGetCapabilitiesRequest) (*csi.NodeGetCapabilitiesResponse, error) {
	return &csi.NodeGetCapabilitiesResponse{Capabilities: []*csi.NodeServiceCapability{{
		Type: &csi.NodeServiceCapability_Rpc{Rpc: &csi.NodeServiceCapability_RPC{
			Type: csi.NodeServiceCapability_RPC_STAGE_UNSTAGE_VOLUME,
		}},
	}}}, nil
}

func (n *Node) NodeGetInfo(context.Context, *csi.NodeGetInfoRequest) (*csi.NodeGetInfoResponse, error) {
	return &csi.NodeGetInfoResponse{NodeId: n.NodeID}, nil
}

func (n *Node) NodeStageVolume(ctx context.Context, req *csi.NodeStageVolumeRequest) (*csi.NodeStageVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	if err := validateCapabilities([]*csi.VolumeCapability{req.GetVolumeCapability()}); err != nil {
		return nil, err
	}
	v, err := volumeFromContext(id, req.GetVolumeContext())
	if err != nil {
		return nil, err
	}

	defer n.volumes.lock(id)()
	if err := n.Stager.Stage(ctx, v, staging); err != nil {
		return nil, status.Errorf(codes.Internal, "staging volume %s at %s: %v", id, staging, err)
	}
	n.Log.Info("staged volume", "volume", id, "staging", staging)
	return &csi.NodeStageVolumeResponse{}, nil
}

func (n *Node) NodeUnstageVolume(ctx context.Context, req *csi.NodeUnstageVolumeRequest) (*csi.NodeUnstageVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	defer n.volumes.lock(id)()
	if err := n.Stager.Unstage(ctx, id, staging); err != nil {
		return nil, status.Errorf(codes.Internal, "unstaging volume %s: %v", id, err)
	}
	n.Log.Info("unstaged volume", "volume", id, "staging", staging)
	return &csi.NodeUnstageVolumeResponse{}, nil
}

func (n *Node) NodePublishVolume(_ context.Context, req *csi.NodePublishVolumeRequest) (*csi.NodePublishVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	target, err := n.path("target", req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	if err := validateCapabilities([]*csi.VolumeCapability{req.GetVolumeCapability()}); err != nil {
		return nil, err
	}

	defer n.targets.lock(target)()
	if ok, err := n.Binder.Mounted(target); err != nil {
		return nil, status.Errorf(codes.Internal, "checking %s: %v", target, err)
	} else if ok {
		return &csi.NodePublishVolumeResponse{}, nil
	}
	if ok, err := n.Binder.Mounted(staging); err != nil {
		return nil, status.Errorf(codes.Internal, "checking %s: %v", staging, err)
	} else if !ok {
		return nil, status.Errorf(codes.FailedPrecondition, "volume %s isn't staged at %s", id, staging)
	}
	if err := n.Binder.Bind(staging, target, req.GetReadonly()); err != nil {
		return nil, status.Errorf(codes.Internal, "publishing volume %s at %s: %v", id, target, err)
	}
	n.Log.Info("published volume", "volume", id, "target", target)
	return &csi.NodePublishVolumeResponse{}, nil
}

func (n *Node) NodeUnpublishVolume(_ context.Context, req *csi.NodeUnpublishVolumeRequest) (*csi.NodeUnpublishVolumeResponse, error) {
	target, err := n.path("target", req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	defer n.targets.lock(target)()
	if err := n.Binder.Unmount(target); err != nil {
		return nil, status.Errorf(codes.Internal, "unmounting %s: %v", target, err)
	}
	n.Log.Info("unpublished volume", "volume", req.GetVolumeId(), "target", target)
	return &csi.NodeUnpublishVolumeResponse{}, nil
}

func (n *Node) path(kind, path string) (string, error) {
	if path == "" {
		return "", status.Errorf(codes.InvalidArgument, "%s path is required", kind)
	}
	clean := filepath.Clean(path)
	root := filepath.Clean(n.TargetRoot)
	if !filepath.IsAbs(clean) || !strings.HasPrefix(clean, root+string(filepath.Separator)) {
		return "", status.Errorf(codes.InvalidArgument, "%s path %s isn't under %s", kind, path, root)
	}
	return clean, nil
}

func volumeFromContext(id string, ctx map[string]string) (Volume, error) {
	capacity, err := strconv.ParseInt(ctx[contextCapacity], 10, 64)
	if err != nil || capacity <= 0 {
		return Volume{}, status.Errorf(codes.InvalidArgument, "volume context %s=%q isn't a size", contextCapacity, ctx[contextCapacity])
	}
	owner, err := parseOwner(ctx)
	if err != nil {
		return Volume{}, err
	}
	return Volume{ID: id, CapacityBytes: capacity, Owner: owner}, nil
}
