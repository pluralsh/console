package zerofs

import (
	"context"
	"io/fs"
	"strconv"
	"strings"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// StorageClass parameters the controller passes to the node plugin, which applies them when it formats a home.
const (
	ParamUID  = "uid"
	ParamGID  = "gid"
	ParamMode = "mode"
	// ParamSeed names the seed a StorageClass's volumes start from, as the JuiceFS driver's does. The first volume
	// created with it is the golden actor's, which starts empty and becomes the seed when Substrate deletes it after
	// the golden tag; every later volume is a copy of that seed.
	ParamSeed = "seed"
)

// contextCapacity carries a volume's size to NodeStageVolume, which sizes the block device by it.
const contextCapacity = "capacityBytes"

// copyTimeout bounds one database copy. It runs detached from the request, so a caller that times out and retries
// waits for the copy under the volume's lock instead of restarting it.
const copyTimeout = 30 * time.Minute

// Store reads and writes objects, implemented over gocloud.dev/blob by BlobStore.
type Store interface {
	DeletePrefix(ctx context.Context, prefix string) (int, error)
	CopyPrefix(ctx context.Context, src, dst string) (int, error)
	Read(ctx context.Context, key string) ([]byte, bool, error)
	Write(ctx context.Context, key string, data []byte) error
	Delete(ctx context.Context, key string) error
}

// Controller is the CSI controller service. It runs as a single replica, so its locks serialize every operation
// on a volume or seed.
type Controller struct {
	csi.UnimplementedControllerServer

	Storage Storage
	Store   Store
	// DefaultCapacity sizes a volume created without a capacity. The device is thin, so it's a ceiling, not an
	// allocation.
	DefaultCapacity int64
	Log             logr.Logger

	volumes keyedLock
	seeds   keyedLock
}

func (c *Controller) ControllerGetCapabilities(context.Context, *csi.ControllerGetCapabilitiesRequest) (*csi.ControllerGetCapabilitiesResponse, error) {
	return &csi.ControllerGetCapabilitiesResponse{Capabilities: []*csi.ControllerServiceCapability{{
		Type: &csi.ControllerServiceCapability_Rpc{Rpc: &csi.ControllerServiceCapability_RPC{
			Type: csi.ControllerServiceCapability_RPC_CREATE_DELETE_VOLUME,
		}},
	}}}, nil
}

// CreateVolume writes nothing for an unseeded volume: its first writer initializes the database. A volume of a
// seeded StorageClass claims the seed or starts as a copy of it. Either way it's idempotent on the name, and an
// existing volume is returned as it is.
func (c *Controller) CreateVolume(ctx context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
	id := req.GetName()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume name %q", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return nil, err
	}
	if req.GetVolumeContentSource() != nil {
		return nil, status.Error(codes.Unimplemented, "ZeroFS volumes can't start from a snapshot or volume")
	}
	seed := req.GetParameters()[ParamSeed]
	if seed != "" && !validID(seed) {
		return nil, status.Errorf(codes.InvalidArgument, "parameter %s=%q isn't a valid seed id", ParamSeed, seed)
	}
	capacity := req.GetCapacityRange().GetRequiredBytes()
	if capacity == 0 {
		capacity = req.GetCapacityRange().GetLimitBytes()
	}
	if capacity == 0 {
		capacity = c.DefaultCapacity
	}
	if capacity <= 0 {
		return nil, status.Error(codes.InvalidArgument, "a capacity is required")
	}
	o, err := parseOwner(req.GetParameters())
	if err != nil {
		return nil, err
	}
	if seed != "" {
		if err := c.seedVolume(ctx, id, seed); err != nil {
			return nil, err
		}
	}
	volumeContext := o.context()
	volumeContext[contextCapacity] = strconv.FormatInt(capacity, 10)
	return &csi.CreateVolumeResponse{Volume: &csi.Volume{
		VolumeId:      id,
		CapacityBytes: capacity,
		VolumeContext: volumeContext,
	}}, nil
}

// seedVolume starts a volume of a seeded StorageClass: as a copy of the seed once it's captured, or empty for the
// volume that claims it. A seed never changes once it's marked captured, and the marker is written last, so copies
// of it hold only their volume's lock and run in parallel; only claiming takes the seed's lock.
func (c *Controller) seedVolume(ctx context.Context, id, seed string) error {
	for {
		if done, err := c.copyCapturedSeed(ctx, id, seed); done || err != nil {
			return err
		}
		if done, err := c.claimSeed(ctx, id, seed); done || err != nil {
			return err
		}
	}
}

// copyCapturedSeed starts the volume as a copy of its seed if the seed is captured. Holds the volume's lock.
func (c *Controller) copyCapturedSeed(ctx context.Context, id, seed string) (bool, error) {
	defer c.volumes.lock(id)()
	if done, err := c.seeded(ctx, id); done || err != nil {
		return done, err
	}
	if captured, err := c.captured(ctx, seed); err != nil || !captured {
		return false, err
	}
	return true, c.cloneSeed(ctx, id, seed)
}

// claimSeed makes the volume its seed's golden volume, or reports false if the seed was captured meanwhile. Holds
// the seed's lock, then the volume's.
func (c *Controller) claimSeed(ctx context.Context, id, seed string) (bool, error) {
	defer c.seeds.lock(seed)()
	defer c.volumes.lock(id)()
	if done, err := c.seeded(ctx, id); done || err != nil {
		return done, err
	}
	if captured, err := c.captured(ctx, seed); err != nil || captured {
		return false, err
	}

	claim, claimed, err := c.Store.Read(ctx, c.Storage.metaKey(metaClaim, seed))
	switch {
	case err != nil:
		return false, status.Errorf(codes.Internal, "reading the claim of seed %s: %v", seed, err)
	case !claimed:
		if err := c.Store.Write(ctx, c.Storage.metaKey(metaClaim, seed), []byte(id)); err != nil {
			return false, status.Errorf(codes.Internal, "claiming seed %s: %v", seed, err)
		}
	case string(claim) != id:
		return false, status.Errorf(codes.FailedPrecondition, "seed %s isn't captured from volume %s yet", seed, claim)
	}
	if err := c.Store.Write(ctx, c.Storage.metaKey(metaGolden, id), []byte(seed)); err != nil {
		return false, status.Errorf(codes.Internal, "marking volume %s as the source of seed %s: %v", id, seed, err)
	}
	c.Log.Info("volume claims seed", "volume", id, "seed", seed)
	return true, nil
}

// seeded reports whether the volume already claimed or copied its seed.
func (c *Controller) seeded(ctx context.Context, id string) (bool, error) {
	for _, kind := range []metaKind{metaGolden, metaCloned} {
		if _, ok, err := c.Store.Read(ctx, c.Storage.metaKey(kind, id)); err != nil {
			return false, status.Errorf(codes.Internal, "checking volume %s: %v", id, err)
		} else if ok {
			return true, nil
		}
	}
	return false, nil
}

func (c *Controller) captured(ctx context.Context, seed string) (bool, error) {
	_, ok, err := c.Store.Read(ctx, c.Storage.metaKey(metaCaptured, seed))
	if err != nil {
		return false, status.Errorf(codes.Internal, "checking seed %s: %v", seed, err)
	}
	return ok, nil
}

// cloneSeed copies a captured seed into a new volume, first clearing what an interrupted copy left. Holds the
// volume's lock.
func (c *Controller) cloneSeed(ctx context.Context, id, seed string) error {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), copyTimeout)
	defer cancel()
	if _, err := c.Store.DeletePrefix(ctx, c.Storage.VolumePrefix(id)); err != nil {
		return status.Errorf(codes.Internal, "clearing volume %s: %v", id, err)
	}
	n, err := c.Store.CopyPrefix(ctx, c.Storage.SeedPrefix(seed), c.Storage.VolumePrefix(id))
	if err != nil {
		return status.Errorf(codes.Internal, "copying seed %s into volume %s: %v", seed, id, err)
	}
	if err := c.Store.Write(ctx, c.Storage.metaKey(metaCloned, id), []byte(seed)); err != nil {
		return status.Errorf(codes.Internal, "marking volume %s as copied from seed %s: %v", id, seed, err)
	}
	c.Log.Info("created volume from seed", "volume", id, "seed", seed, "objects", n)
	return nil
}

// DeleteVolume removes the volume's objects, first capturing it as the seed it claimed: Substrate deletes the
// golden actor, suspended, right after the golden tag, so the volume is the state the tag's memory snapshot saw.
// Substrate detaches a volume before deleting it, so no writer is left to change or recreate its objects.
func (c *Controller) DeleteVolume(ctx context.Context, req *csi.DeleteVolumeRequest) (*csi.DeleteVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	seed, golden, err := c.Store.Read(ctx, c.Storage.metaKey(metaGolden, id))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading the seed of volume %s: %v", id, err)
	}
	if golden {
		defer c.seeds.lock(string(seed))()
	}
	defer c.volumes.lock(id)()
	if golden {
		if err := c.captureSeed(ctx, string(seed), id); err != nil {
			return nil, err
		}
	}
	n, err := c.Store.DeletePrefix(ctx, c.Storage.VolumePrefix(id))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "deleting volume %s: %v", id, err)
	}
	for _, kind := range []metaKind{metaCloned, metaGolden} {
		if err := c.Store.Delete(ctx, c.Storage.metaKey(kind, id)); err != nil {
			return nil, status.Errorf(codes.Internal, "deleting volume %s: %v", id, err)
		}
	}
	c.Log.Info("deleted volume", "volume", id, "objects", n)
	return &csi.DeleteVolumeResponse{}, nil
}

// captureSeed copies a golden volume's database into its seed unless that happened already. Holds both locks.
func (c *Controller) captureSeed(ctx context.Context, seed, volume string) error {
	if captured, err := c.captured(ctx, seed); err != nil || captured {
		return err
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), copyTimeout)
	defer cancel()
	if _, err := c.Store.DeletePrefix(ctx, c.Storage.SeedPrefix(seed)); err != nil {
		return status.Errorf(codes.Internal, "clearing seed %s: %v", seed, err)
	}
	n, err := c.Store.CopyPrefix(ctx, c.Storage.VolumePrefix(volume), c.Storage.SeedPrefix(seed))
	if err != nil {
		return status.Errorf(codes.Internal, "copying volume %s into seed %s: %v", volume, seed, err)
	}
	if n == 0 {
		c.Log.Info("golden volume was never written, so its seed isn't captured", "volume", volume, "seed", seed)
		return nil
	}
	if err := c.Store.Write(ctx, c.Storage.metaKey(metaCaptured, seed), []byte(volume)); err != nil {
		return status.Errorf(codes.Internal, "marking seed %s as captured: %v", seed, err)
	}
	c.Log.Info("captured seed", "seed", seed, "volume", volume, "objects", n)
	return nil
}

func (c *Controller) ValidateVolumeCapabilities(_ context.Context, req *csi.ValidateVolumeCapabilitiesRequest) (*csi.ValidateVolumeCapabilitiesResponse, error) {
	if id := req.GetVolumeId(); !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return &csi.ValidateVolumeCapabilitiesResponse{Message: err.Error()}, nil
	}
	return &csi.ValidateVolumeCapabilitiesResponse{Confirmed: &csi.ValidateVolumeCapabilitiesResponse_Confirmed{
		VolumeCapabilities: req.GetVolumeCapabilities(),
	}}, nil
}

func validateCapabilities(caps []*csi.VolumeCapability) error {
	if len(caps) == 0 {
		return status.Error(codes.InvalidArgument, "volume capabilities are required")
	}
	for _, c := range caps {
		if c.GetMount() == nil {
			return status.Error(codes.InvalidArgument, "only filesystem volumes are supported")
		}
		if fsType := c.GetMount().GetFsType(); fsType != "" && fsType != "ext4" {
			return status.Errorf(codes.InvalidArgument, "filesystem %s isn't supported, only ext4", fsType)
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

// Owner is who owns a freshly formatted home's root directory, and its mode. A negative id leaves root's.
type Owner struct {
	UID, GID int
	Mode     fs.FileMode
}

func parseOwner(params map[string]string) (Owner, error) {
	o := Owner{UID: -1, GID: -1, Mode: 0o755}
	for key, dst := range map[string]*int{ParamUID: &o.UID, ParamGID: &o.GID} {
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
		o.Mode = fs.FileMode(n)
	}
	return o, nil
}

func (o Owner) context() map[string]string {
	ctx := map[string]string{ParamMode: strconv.FormatUint(uint64(o.Mode), 8)}
	if o.UID >= 0 {
		ctx[ParamUID] = strconv.Itoa(o.UID)
	}
	if o.GID >= 0 {
		ctx[ParamGID] = strconv.Itoa(o.GID)
	}
	return ctx
}
