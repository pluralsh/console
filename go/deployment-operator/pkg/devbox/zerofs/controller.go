package zerofs

import (
	"context"
	"io/fs"
	"strconv"
	"strings"

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
	// ParamSeed is the JuiceFS driver's seeded StorageClass parameter, refused here until ZeroFS seeds exist.
	ParamSeed = "seed"
)

// contextCapacity carries a volume's size to NodeStageVolume, which sizes the block device by it.
const contextCapacity = "capacityBytes"

// Store deletes objects, implemented over gocloud.dev/blob by BlobStore.
type Store interface {
	DeletePrefix(ctx context.Context, prefix string) (int, error)
}

// Controller is the CSI controller service.
type Controller struct {
	csi.UnimplementedControllerServer

	Storage Storage
	Store   Store
	// DefaultCapacity sizes a volume created without a capacity. The device is thin, so it's a ceiling, not an
	// allocation.
	DefaultCapacity int64
	Log             logr.Logger

	volumes keyedLock
}

func (c *Controller) ControllerGetCapabilities(context.Context, *csi.ControllerGetCapabilitiesRequest) (*csi.ControllerGetCapabilitiesResponse, error) {
	return &csi.ControllerGetCapabilitiesResponse{Capabilities: []*csi.ControllerServiceCapability{{
		Type: &csi.ControllerServiceCapability_Rpc{Rpc: &csi.ControllerServiceCapability_RPC{
			Type: csi.ControllerServiceCapability_RPC_CREATE_DELETE_VOLUME,
		}},
	}}}, nil
}

// CreateVolume writes nothing: the volume's first writer initializes its database. It's idempotent on the name
// because the response is a function of the request alone.
func (c *Controller) CreateVolume(_ context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
	id := req.GetName()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume name %q", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return nil, err
	}
	if req.GetVolumeContentSource() != nil || req.GetParameters()[ParamSeed] != "" {
		return nil, status.Error(codes.Unimplemented, "ZeroFS volumes can't start from a seed or snapshot yet")
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
	volumeContext := o.context()
	volumeContext[contextCapacity] = strconv.FormatInt(capacity, 10)
	return &csi.CreateVolumeResponse{Volume: &csi.Volume{
		VolumeId:      id,
		CapacityBytes: capacity,
		VolumeContext: volumeContext,
	}}, nil
}

// DeleteVolume removes the volume's objects. Substrate detaches a volume before deleting it, so no writer is
// left to recreate them.
func (c *Controller) DeleteVolume(ctx context.Context, req *csi.DeleteVolumeRequest) (*csi.DeleteVolumeResponse, error) {
	id := req.GetVolumeId()
	if !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	defer c.volumes.lock(id)()
	n, err := c.Store.DeletePrefix(ctx, c.Storage.VolumePrefix(id))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "deleting volume %s: %v", id, err)
	}
	c.Log.Info("deleted volume", "volume", id, "objects", n)
	return &csi.DeleteVolumeResponse{}, nil
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
