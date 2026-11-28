package block

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Mounter makes and removes bind mounts.
type Mounter interface {
	Bind(source, target string, readonly bool) error
	// Unmount unmounts target; a target that isn't mounted is no error.
	Unmount(target string) error
	IsMounted(path string) (bool, error)
	// Sync writes the dirty data of the filesystem path is on to its disk.
	Sync(path string) error
}

// Node is the CSI node service. The kubelet mounts the volume's disk for its anchor pod once it's attached, around
// when atelet stages it, so staging waits for that mount and bind-mounts it to the staging path, and publishing
// bind-mounts the staging path to the target. Staging and target paths must sit under TargetRoot, where atelet
// puts both, and the anchor's mount under KubeletRoot. The plugin needs both directories with mount propagation:
// the kubelet's mounts must reach it, and its own mounts must reach atelet.
type Node struct {
	csi.UnimplementedNodeServer

	// NodeID is the Kubernetes node name, which Substrate attaches to.
	NodeID      string
	TargetRoot  string
	KubeletRoot string
	Mounter     Mounter
	// MountWait bounds how long staging waits for the kubelet to mount the disk. Defaults to two minutes.
	MountWait    time.Duration
	PollInterval time.Duration
	// PrepareHome readies a staged home for its owner. Defaults to PrepareHome.
	PrepareHome func(root string, owner Owner) error
	Log         logr.Logger
}

func (n *Node) NodeGetCapabilities(context.Context, *csi.NodeGetCapabilitiesRequest) (*csi.NodeGetCapabilitiesResponse, error) {
	return &csi.NodeGetCapabilitiesResponse{Capabilities: []*csi.NodeServiceCapability{{
		Type: &csi.NodeServiceCapability_Rpc{Rpc: &csi.NodeServiceCapability_RPC{Type: csi.NodeServiceCapability_RPC_STAGE_UNSTAGE_VOLUME}},
	}}}, nil
}

func (n *Node) NodeGetInfo(context.Context, *csi.NodeGetInfoRequest) (*csi.NodeGetInfoResponse, error) {
	return &csi.NodeGetInfoResponse{NodeId: n.NodeID}, nil
}

// NodeStageVolume bind-mounts the disk's mount, named by the publish context, to the staging path and hands a
// fresh home to its owner.
func (n *Node) NodeStageVolume(ctx context.Context, req *csi.NodeStageVolumeRequest) (*csi.NodeStageVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	source, err := n.source(req.GetPublishContext()[PublishContextSource])
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "volume %s: %v", id, err)
	}
	owner, err := parseOwner(req.GetVolumeContext())
	if err != nil {
		return nil, err
	}
	mounted, err := n.Mounter.IsMounted(staging)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "checking staging path %s: %v", staging, err)
	}
	if !mounted {
		if err := n.waitMounted(ctx, id, source); err != nil {
			return nil, err
		}
		if err := os.MkdirAll(staging, 0o750); err != nil {
			return nil, status.Errorf(codes.Internal, "creating staging path %s: %v", staging, err)
		}
		if err := n.Mounter.Bind(source, staging, false); err != nil {
			return nil, status.Errorf(codes.Internal, "mounting volume %s at %s: %v", id, staging, err)
		}
	}
	prepare := n.PrepareHome
	if prepare == nil {
		prepare = PrepareHome
	}
	if err := prepare(staging, owner); err != nil {
		return nil, status.Errorf(codes.Internal, "preparing the home of volume %s: %v", id, err)
	}
	n.Log.Info("staged volume", "volume", id, "source", source, "staging", staging)
	return &csi.NodeStageVolumeResponse{}, nil
}

// NodeUnstageVolume syncs the home's filesystem, which unmounting the bind mount doesn't, and unmounts it. The disk
// may stay attached and mounted for the anchor a while after (the controller's DetachDelay), so this is what makes
// the box's writes durable at suspend.
func (n *Node) NodeUnstageVolume(_ context.Context, req *csi.NodeUnstageVolumeRequest) (*csi.NodeUnstageVolumeResponse, error) {
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	mounted, err := n.Mounter.IsMounted(staging)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "checking staging path %s: %v", staging, err)
	}
	if !mounted {
		return &csi.NodeUnstageVolumeResponse{}, nil
	}
	if err := n.Mounter.Sync(staging); err != nil {
		return nil, status.Errorf(codes.Internal, "syncing %s: %v", staging, err)
	}
	if err := n.Mounter.Unmount(staging); err != nil {
		return nil, status.Errorf(codes.Internal, "unmounting %s: %v", staging, err)
	}
	n.Log.Info("unstaged volume", "volume", req.GetVolumeId(), "staging", staging)
	return &csi.NodeUnstageVolumeResponse{}, nil
}

func (n *Node) NodePublishVolume(_ context.Context, req *csi.NodePublishVolumeRequest) (*csi.NodePublishVolumeResponse, error) {
	staging, err := n.path("staging", req.GetStagingTargetPath())
	if err != nil {
		return nil, err
	}
	target, err := n.path("target", req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	if mounted, err := n.Mounter.IsMounted(target); err != nil {
		return nil, status.Errorf(codes.Internal, "checking target path %s: %v", target, err)
	} else if mounted {
		return &csi.NodePublishVolumeResponse{}, nil
	}
	if ok, err := n.Mounter.IsMounted(staging); err != nil {
		return nil, status.Errorf(codes.Internal, "checking staging path %s: %v", staging, err)
	} else if !ok {
		return nil, status.Errorf(codes.FailedPrecondition, "volume %s isn't staged at %s", req.GetVolumeId(), staging)
	}
	if err := os.MkdirAll(target, 0o750); err != nil {
		return nil, status.Errorf(codes.Internal, "creating target path %s: %v", target, err)
	}
	if err := n.Mounter.Bind(staging, target, req.GetReadonly()); err != nil {
		return nil, status.Errorf(codes.Internal, "mounting volume %s at %s: %v", req.GetVolumeId(), target, err)
	}
	return &csi.NodePublishVolumeResponse{}, nil
}

func (n *Node) NodeUnpublishVolume(_ context.Context, req *csi.NodeUnpublishVolumeRequest) (*csi.NodeUnpublishVolumeResponse, error) {
	target, err := n.path("target", req.GetTargetPath())
	if err != nil {
		return nil, err
	}
	if err := n.Mounter.Unmount(target); err != nil {
		return nil, status.Errorf(codes.Internal, "unmounting %s: %v", target, err)
	}
	if err := os.Remove(target); err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, status.Errorf(codes.Internal, "removing %s: %v", target, err)
	}
	return &csi.NodeUnpublishVolumeResponse{}, nil
}

// waitMounted waits for the kubelet to mount the disk at source, which it does right after the attach.
func (n *Node) waitMounted(ctx context.Context, id, source string) error {
	wait := n.MountWait
	if wait <= 0 {
		wait = defaultDiskWait
	}
	interval := n.PollInterval
	if interval <= 0 {
		interval = 100 * time.Millisecond
	}
	ctx, cancel := context.WithTimeout(ctx, wait)
	defer cancel()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		ok, err := n.Mounter.IsMounted(source)
		if err != nil {
			return status.Errorf(codes.Internal, "checking the disk's mount %s: %v", source, err)
		}
		if ok {
			return nil
		}
		select {
		case <-ctx.Done():
			return status.Errorf(codes.Unavailable, "the disk of volume %s isn't mounted at %s yet", id, source)
		case <-ticker.C:
		}
	}
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

// source is where on the node the anchor pod's volume is mounted: rel, a CSI volume's mount in a pod's directory,
// under the kubelet's root.
func (n *Node) source(rel string) (string, error) {
	if rel == "" {
		return "", errors.New("no disk mount in the publish context")
	}
	clean := filepath.Clean(rel)
	parts := strings.Split(clean, string(filepath.Separator))
	if filepath.IsAbs(clean) || len(parts) != 6 || parts[0] != "pods" || parts[2] != "volumes" || parts[3] != "kubernetes.io~csi" || parts[5] != "mount" {
		return "", fmt.Errorf("%q isn't a pod's CSI volume mount", rel)
	}
	return filepath.Join(n.KubeletRoot, clean), nil
}

const lostFound = "lost+found"

// PrepareHome hands a freshly formatted home (nothing in it but lost+found) to its owner, and removes an empty
// lost+found, which is root's and which ext4 doesn't need; e2fsck recreates it if it has orphans to place. A home
// started from a seed already has its owner.
func PrepareHome(root string, owner Owner) error {
	entries, err := os.ReadDir(root)
	if err != nil {
		return err
	}
	fresh := true
	for _, e := range entries {
		if e.Name() != lostFound {
			fresh = false
		}
	}
	if fresh {
		if err := os.Chmod(root, owner.Mode); err != nil {
			return fmt.Errorf("setting the mode of the home: %w", err)
		}
		if owner.UID >= 0 || owner.GID >= 0 {
			if err := os.Lchown(root, owner.UID, owner.GID); err != nil {
				return fmt.Errorf("setting the owner of the home: %w", err)
			}
		}
	}
	// Remove only succeeds on an empty directory, which is the only lost+found worth removing.
	if err := os.Remove(filepath.Join(root, lostFound)); err != nil && !errors.Is(err, os.ErrNotExist) && !isNotEmpty(err) {
		return fmt.Errorf("removing lost+found: %w", err)
	}
	return nil
}

func isNotEmpty(err error) bool {
	return errors.Is(err, syscall.ENOTEMPTY) || errors.Is(err, syscall.EEXIST)
}
