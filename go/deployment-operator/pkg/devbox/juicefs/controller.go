package juicefs

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// StorageClass parameters the controller reads when it creates a home.
const (
	ParamUID  = "uid"
	ParamGID  = "gid"
	ParamMode = "mode"
	// ParamSeed names the seed a StorageClass's volumes start from. The first volume created with it is the
	// golden actor's, which starts empty and becomes the seed when Substrate deletes it after the golden tag;
	// every later volume is a clone of that seed.
	ParamSeed = "seed"
)

// Controller is the CSI controller service. Root is where the whole filesystem is mounted.
type Controller struct {
	csi.UnimplementedControllerServer

	Root string
	CLI  CLI
	Log  logr.Logger

	volumes   keyedLock
	snapshots keyedLock
}

func (c *Controller) homeDir(id string) string { return filepath.Join(c.Root, homesDir, id) }
func (c *Controller) seedDir(id string) string { return filepath.Join(c.Root, seedsDir, id) }

// claimFile records which volume a seed is captured from. It outlives the capture so that no later volume ever
// becomes the seed, since that volume would be a user's home.
func (c *Controller) claimFile(seed string) string { return filepath.Join(c.Root, claimsDir, seed) }

// goldenFile records the seed a volume becomes when it's deleted.
func (c *Controller) goldenFile(volume string) string {
	return filepath.Join(c.Root, goldenDir, volume)
}

func (c *Controller) ControllerGetCapabilities(context.Context, *csi.ControllerGetCapabilitiesRequest) (*csi.ControllerGetCapabilitiesResponse, error) {
	caps := []csi.ControllerServiceCapability_RPC_Type{
		csi.ControllerServiceCapability_RPC_CREATE_DELETE_VOLUME,
		csi.ControllerServiceCapability_RPC_CREATE_DELETE_SNAPSHOT,
		csi.ControllerServiceCapability_RPC_CLONE_VOLUME,
	}
	resp := &csi.ControllerGetCapabilitiesResponse{}
	for _, c := range caps {
		resp.Capabilities = append(resp.Capabilities, &csi.ControllerServiceCapability{
			Type: &csi.ControllerServiceCapability_Rpc{Rpc: &csi.ControllerServiceCapability_RPC{Type: c}},
		})
	}
	return resp, nil
}

// CreateVolume is idempotent on the name: an existing home is returned as it is, whatever content source the
// call names, because Substrate creates an actor's volumes without one after the gateway may have seeded them.
// Without a content source, a volume of a StorageClass with a seed parameter is cloned from that seed.
func (c *Controller) CreateVolume(ctx context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
	id := req.GetName()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume name %q", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return nil, err
	}
	capacity := req.GetCapacityRange().GetRequiredBytes()
	if capacity == 0 {
		capacity = req.GetCapacityRange().GetLimitBytes()
	}
	owner, err := parseOwner(req.GetParameters())
	if err != nil {
		return nil, err
	}
	source := req.GetVolumeContentSource()
	seed := req.GetParameters()[ParamSeed]
	if seed != "" && !validID(seed) {
		return nil, status.Errorf(codes.InvalidArgument, "parameter %s=%q isn't a valid seed id", ParamSeed, seed)
	}
	if source != nil {
		seed = ""
	}

	if seed != "" {
		defer c.snapshots.lock(seed)()
	}
	defer c.volumes.lock(id)()
	exists, err := isDir(c.homeDir(id))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "checking volume %s: %v", id, err)
	}
	if !exists {
		if seed != "" {
			if source, err = c.seedSource(id, seed); err != nil {
				return nil, err
			}
		}
		if err := c.provision(ctx, id, source, owner); err != nil {
			return nil, err
		}
		c.Log.Info("created volume", "volume", id, "source", sourceName(source), "capacityBytes", capacity)
	}
	if capacity > 0 {
		if err := c.CLI.SetQuota(ctx, HomePath(id), capacity); err != nil {
			return nil, status.Errorf(codes.Internal, "setting the quota of volume %s: %v", id, err)
		}
	}
	return &csi.CreateVolumeResponse{Volume: &csi.Volume{
		VolumeId:      id,
		CapacityBytes: capacity,
		ContentSource: req.GetVolumeContentSource(),
	}}, nil
}

// seedSource is where a new volume of a seeded StorageClass starts: the seed once it's captured, or nothing for
// the volume that claims it. Holds the seed's lock.
func (c *Controller) seedSource(id, seed string) (*csi.VolumeContentSource, error) {
	if ok, err := isDir(c.seedDir(seed)); err != nil {
		return nil, status.Errorf(codes.Internal, "checking seed %s: %v", seed, err)
	} else if ok {
		return &csi.VolumeContentSource{Type: &csi.VolumeContentSource_Snapshot{
			Snapshot: &csi.VolumeContentSource_SnapshotSource{SnapshotId: seed},
		}}, nil
	}
	for _, dir := range []string{claimsDir, goldenDir} {
		if err := os.MkdirAll(filepath.Join(c.Root, dir), 0o755); err != nil {
			return nil, status.Errorf(codes.Internal, "creating the %s directory: %v", dir, err)
		}
	}
	f, err := os.OpenFile(c.claimFile(seed), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	switch {
	case err == nil:
		_, werr := f.WriteString(id)
		if err := errors.Join(werr, f.Close()); err != nil {
			return nil, status.Errorf(codes.Internal, "claiming seed %s: %v", seed, err)
		}
	case errors.Is(err, fs.ErrExist):
		owner, err := os.ReadFile(c.claimFile(seed))
		if err != nil {
			return nil, status.Errorf(codes.Internal, "reading the claim of seed %s: %v", seed, err)
		}
		if string(owner) != id {
			return nil, status.Errorf(codes.FailedPrecondition, "seed %s isn't captured from volume %s yet", seed, owner)
		}
	default:
		return nil, status.Errorf(codes.Internal, "claiming seed %s: %v", seed, err)
	}
	if err := os.WriteFile(c.goldenFile(id), []byte(seed), 0o644); err != nil {
		return nil, status.Errorf(codes.Internal, "marking volume %s as the source of seed %s: %v", id, seed, err)
	}
	c.Log.Info("volume claims seed", "volume", id, "seed", seed)
	return nil, nil
}

func (c *Controller) provision(ctx context.Context, id string, source *csi.VolumeContentSource, owner owner) error {
	if err := os.MkdirAll(filepath.Join(c.Root, homesDir), 0o755); err != nil {
		return status.Errorf(codes.Internal, "creating the homes directory: %v", err)
	}
	partial := filepath.Join(c.Root, homesDir, partialPrefix+id)
	if err := c.clearPartial(ctx, partial); err != nil {
		return err
	}
	var from string
	switch {
	case source.GetSnapshot() != nil:
		sid := source.GetSnapshot().GetSnapshotId()
		if !validID(sid) {
			return status.Errorf(codes.InvalidArgument, "invalid snapshot id %q", sid)
		}
		from = filepath.Join(c.seedDir(sid), seedDataDir)
	case source.GetVolume() != nil:
		vid := source.GetVolume().GetVolumeId()
		if !validID(vid) {
			return status.Errorf(codes.InvalidArgument, "invalid volume id %q", vid)
		}
		from = c.homeDir(vid)
	}
	if from == "" {
		if err := owner.mkdir(partial); err != nil {
			return err
		}
	} else if ok, err := isDir(from); err != nil {
		return status.Errorf(codes.Internal, "checking the source of volume %s: %v", id, err)
	} else if !ok {
		return status.Errorf(codes.NotFound, "the source of volume %s doesn't exist", id)
	} else if err := c.CLI.Clone(ctx, from, partial); err != nil {
		return status.Errorf(codes.Internal, "cloning volume %s: %v", id, err)
	}
	if err := os.Rename(partial, c.homeDir(id)); err != nil {
		return status.Errorf(codes.Internal, "publishing volume %s: %v", id, err)
	}
	return nil
}

// DeleteVolume removes the home, first capturing it as the seed it claimed: Substrate deletes the golden actor,
// suspended, right after the golden tag, so the home is the state the tag's memory snapshot saw.
func (c *Controller) DeleteVolume(ctx context.Context, req *csi.DeleteVolumeRequest) (*csi.DeleteVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	seed, err := os.ReadFile(c.goldenFile(id))
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, status.Errorf(codes.Internal, "reading the seed of volume %s: %v", id, err)
	}
	if len(seed) > 0 {
		defer c.snapshots.lock(string(seed))()
	}
	defer c.volumes.lock(id)()
	if len(seed) > 0 {
		if err := c.captureSeed(ctx, string(seed), id); err != nil {
			return nil, err
		}
	}
	if err := c.removeIfExists(ctx, c.homeDir(id)); err != nil {
		return nil, status.Errorf(codes.Internal, "deleting volume %s: %v", id, err)
	}
	if len(seed) > 0 {
		if err := os.Remove(c.goldenFile(id)); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return nil, status.Errorf(codes.Internal, "deleting volume %s: %v", id, err)
		}
	}
	c.Log.Info("deleted volume", "volume", id)
	return &csi.DeleteVolumeResponse{}, nil
}

// captureSeed clones a golden volume into its seed unless that happened already. Holds both locks.
func (c *Controller) captureSeed(ctx context.Context, seed, volume string) error {
	if ok, err := isDir(c.seedDir(seed)); err != nil {
		return status.Errorf(codes.Internal, "checking seed %s: %v", seed, err)
	} else if ok {
		return nil
	}
	if ok, err := isDir(c.homeDir(volume)); err != nil {
		return status.Errorf(codes.Internal, "checking volume %s: %v", volume, err)
	} else if !ok {
		c.Log.Info("golden volume is gone before its seed was captured", "volume", volume, "seed", seed)
		return nil
	}
	if err := c.cloneSeed(ctx, seed, volume); err != nil {
		return err
	}
	c.Log.Info("captured seed", "seed", seed, "volume", volume)
	return nil
}

func (c *Controller) ValidateVolumeCapabilities(_ context.Context, req *csi.ValidateVolumeCapabilitiesRequest) (*csi.ValidateVolumeCapabilitiesResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	if ok, err := isDir(c.homeDir(id)); err != nil {
		return nil, status.Errorf(codes.Internal, "checking volume %s: %v", id, err)
	} else if !ok {
		return nil, status.Errorf(codes.NotFound, "volume %s doesn't exist", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return &csi.ValidateVolumeCapabilitiesResponse{Message: err.Error()}, nil
	}
	return &csi.ValidateVolumeCapabilitiesResponse{Confirmed: &csi.ValidateVolumeCapabilitiesResponse_Confirmed{
		VolumeCapabilities: req.GetVolumeCapabilities(),
	}}, nil
}

// CreateSnapshot clones the source home into a seed. The caller must have stopped writes to the home, which the
// gateway does by suspending the actor, so the clone is a consistent point in time. It's idempotent on the name.
func (c *Controller) CreateSnapshot(ctx context.Context, req *csi.CreateSnapshotRequest) (*csi.CreateSnapshotResponse, error) {
	id, source := req.GetName(), req.GetSourceVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid snapshot name %q", id)
	}
	if !validID(source) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid source volume id %q", source)
	}

	defer c.snapshots.lock(id)()
	seed := c.seedDir(id)
	if info, err := os.Stat(seed); err == nil {
		got, err := os.ReadFile(filepath.Join(seed, seedSourceKey))
		if err != nil {
			return nil, status.Errorf(codes.Internal, "reading snapshot %s: %v", id, err)
		}
		if string(got) != source {
			return nil, status.Errorf(codes.AlreadyExists, "snapshot %s was taken of volume %s, not %s", id, got, source)
		}
		return snapshotResponse(id, source, info), nil
	} else if !errors.Is(err, fs.ErrNotExist) {
		return nil, status.Errorf(codes.Internal, "checking snapshot %s: %v", id, err)
	}

	defer c.volumes.lock(source)()
	if ok, err := isDir(c.homeDir(source)); err != nil {
		return nil, status.Errorf(codes.Internal, "checking volume %s: %v", source, err)
	} else if !ok {
		return nil, status.Errorf(codes.NotFound, "volume %s doesn't exist", source)
	}
	if err := c.cloneSeed(ctx, id, source); err != nil {
		return nil, err
	}
	info, err := os.Stat(seed)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading snapshot %s: %v", id, err)
	}
	c.Log.Info("created snapshot", "snapshot", id, "volume", source)
	return snapshotResponse(id, source, info), nil
}

// cloneSeed clones a home into a new seed, published by a rename so a seed is never seen half cloned.
func (c *Controller) cloneSeed(ctx context.Context, id, source string) error {
	if err := os.MkdirAll(filepath.Join(c.Root, seedsDir), 0o755); err != nil {
		return status.Errorf(codes.Internal, "creating the seeds directory: %v", err)
	}
	partial := filepath.Join(c.Root, seedsDir, partialPrefix+id)
	if err := c.clearPartial(ctx, partial); err != nil {
		return err
	}
	if err := os.Mkdir(partial, 0o755); err != nil {
		return status.Errorf(codes.Internal, "creating snapshot %s: %v", id, err)
	}
	if err := c.CLI.Clone(ctx, c.homeDir(source), filepath.Join(partial, seedDataDir)); err != nil {
		return status.Errorf(codes.Internal, "cloning volume %s into snapshot %s: %v", source, id, err)
	}
	if err := os.WriteFile(filepath.Join(partial, seedSourceKey), []byte(source), 0o644); err != nil {
		return status.Errorf(codes.Internal, "writing snapshot %s: %v", id, err)
	}
	if err := os.Rename(partial, c.seedDir(id)); err != nil {
		return status.Errorf(codes.Internal, "publishing snapshot %s: %v", id, err)
	}
	return nil
}

func (c *Controller) DeleteSnapshot(ctx context.Context, req *csi.DeleteSnapshotRequest) (*csi.DeleteSnapshotResponse, error) {
	id := req.GetSnapshotId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid snapshot id %q", id)
	}
	defer c.snapshots.lock(id)()
	if err := c.removeIfExists(ctx, c.seedDir(id)); err != nil {
		return nil, status.Errorf(codes.Internal, "deleting snapshot %s: %v", id, err)
	}
	c.Log.Info("deleted snapshot", "snapshot", id)
	return &csi.DeleteSnapshotResponse{}, nil
}

// clearPartial removes what an interrupted clone left behind, since `juicefs clone` refuses an existing target.
func (c *Controller) clearPartial(ctx context.Context, path string) error {
	if err := c.removeIfExists(ctx, path); err != nil {
		return status.Errorf(codes.Internal, "removing the interrupted clone %s: %v", filepath.Base(path), err)
	}
	return nil
}

func (c *Controller) removeIfExists(ctx context.Context, path string) error {
	if _, err := os.Lstat(path); errors.Is(err, fs.ErrNotExist) {
		return nil
	} else if err != nil {
		return err
	}
	return c.CLI.RemoveAll(ctx, path)
}

func snapshotResponse(id, source string, info fs.FileInfo) *csi.CreateSnapshotResponse {
	return &csi.CreateSnapshotResponse{Snapshot: &csi.Snapshot{
		SnapshotId:     id,
		SourceVolumeId: source,
		CreationTime:   timestamppb.New(info.ModTime()),
		ReadyToUse:     true,
	}}
}

func validateCapabilities(caps []*csi.VolumeCapability) error {
	if len(caps) == 0 {
		return status.Error(codes.InvalidArgument, "volume capabilities are required")
	}
	for _, c := range caps {
		if c.GetMount() == nil {
			return status.Error(codes.InvalidArgument, "only filesystem volumes are supported")
		}
		switch c.GetAccessMode().GetMode() {
		case csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_SINGLE_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_MULTI_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_READER_ONLY:
		default:
			return status.Errorf(codes.InvalidArgument, "access mode %s isn't supported", c.GetAccessMode().GetMode())
		}
	}
	return nil
}

func sourceName(s *csi.VolumeContentSource) string {
	switch {
	case s.GetSnapshot() != nil:
		return "snapshot/" + s.GetSnapshot().GetSnapshotId()
	case s.GetVolume() != nil:
		return "volume/" + s.GetVolume().GetVolumeId()
	}
	return ""
}

type owner struct {
	uid, gid int
	mode     fs.FileMode
}

func parseOwner(params map[string]string) (owner, error) {
	o := owner{uid: -1, gid: -1, mode: 0o755}
	for key, dst := range map[string]*int{ParamUID: &o.uid, ParamGID: &o.gid} {
		if v, ok := params[key]; ok {
			n, err := strconv.Atoi(v)
			if err != nil || n < 0 {
				return o, status.Errorf(codes.InvalidArgument, "parameter %s=%q isn't a user or group id", key, v)
			}
			*dst = n
		}
	}
	if v, ok := params[ParamMode]; ok {
		n, err := strconv.ParseUint(strings.TrimPrefix(v, "0o"), 8, 32)
		if err != nil || n > 0o7777 {
			return o, status.Errorf(codes.InvalidArgument, "parameter %s=%q isn't an octal mode", ParamMode, v)
		}
		o.mode = fs.FileMode(n)
	}
	return o, nil
}

func (o owner) mkdir(path string) error {
	if err := os.Mkdir(path, 0o700); err != nil {
		return status.Errorf(codes.Internal, "creating %s: %v", filepath.Base(path), err)
	}
	if err := os.Chmod(path, o.mode); err != nil {
		return status.Errorf(codes.Internal, "setting the mode of %s: %v", filepath.Base(path), err)
	}
	if o.uid >= 0 || o.gid >= 0 {
		if err := os.Lchown(path, o.uid, o.gid); err != nil {
			return status.Errorf(codes.Internal, "setting the owner of %s: %v", filepath.Base(path), err)
		}
	}
	return nil
}

func isDir(path string) (bool, error) {
	info, err := os.Stat(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if !info.IsDir() {
		return false, fmt.Errorf("%s isn't a directory", path)
	}
	return true, nil
}
