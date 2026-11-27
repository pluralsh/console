// Package block is the CSI driver behind block storage devbox homes: one disk per home, formatted ext4 and mounted
// by the node's kernel. It doesn't talk to the storage itself. The disks come from the provider, the CSI driver for
// disks the cluster already runs (the AWS EBS or GCP PD driver, or any other that attaches disks), and the
// controller drives it through Kubernetes alone, the way pods use it (see KubeDisks). It fills the gaps between
// what Substrate asks of a CSI driver and how the provider works:
//
//   - Topology. Substrate creates an actor's volumes before it picks a worker, and passes no topology, so where a
//     disk must live isn't known at CreateVolume. The controller records the volume there and creates the disk on
//     the first ControllerPublishVolume, for the node Substrate picked. Later attaches must reach the disk: the
//     gateway pins each instance to its zone with the actor's worker_selector. An attach to a node that can't
//     reach the disk moves the disk there through a snapshot, which only happens once the gateway re-pins an
//     instance. Golden, warm and probe actors run once and need no pin.
//   - Mounting. atelet stages and publishes volumes under its own directory, which the provider's node plugin
//     can't see. The provider mounts each attached disk for an anchor pod, and the node plugin bind-mounts that
//     mount into atelet's paths.
//   - Seeds. The first volume of a seed (a revision's StorageClass) is the golden actor's. When Substrate deletes
//     it after the golden tag, the controller snapshots its disk, and every later disk of the seed is created from
//     that snapshot.
//   - Size. Substrate creates a volume once and never expands it. The controller grows a disk at attach to the
//     largest size the StorageClasses of its group (the runner) ask for.
//   - The home's owner. The node plugin hands a freshly formatted home to the dev user, as the ZeroFS driver does.
//
// Substrate only ever sees the volume's name as its ID. The controller keeps each volume's state and each seed's
// in a ConfigMap. It checks the provider before serving (see KubeDisks.Check).
package block

import (
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"regexp"
	"strconv"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// DriverName is the CSI driver name both plugins report, distinct from the provider's.
const DriverName = "block.devbox.plural.sh"

// StorageClass parameters this driver handles. Every other parameter goes to the provider unchanged.
const (
	ParamUID  = "uid"
	ParamGID  = "gid"
	ParamMode = "mode"
	// ParamSeed names the seed a StorageClass's volumes start from, as the ZeroFS driver's does.
	ParamSeed = "seed"
	// ParamGroup and ParamSize let volumes grow: a disk grows at attach to the largest size any StorageClass of
	// its group asks for. The operator sets them on each revision's class, with the runner's atespace as group.
	ParamGroup = "group"
	ParamSize  = "size"
)

// PublishContextSource carries where the disk is mounted on the node, relative to the kubelet's root directory,
// from ControllerPublishVolume to the node plugin.
const PublishContextSource = "block.devbox.plural.sh/source"

// contextCapacity carries a volume's size in its volume context.
const contextCapacity = "capacityBytes"

// ownParams are the parameters the provider never sees.
var ownParams = map[string]bool{ParamUID: true, ParamGID: true, ParamMode: true, ParamSeed: true, ParamGroup: true, ParamSize: true}

// upstreamNamePattern is the names disks and snapshots get: DNS labels, which also fit in a label value.
var upstreamNamePattern = regexp.MustCompile(`^[a-z]([-a-z0-9]{0,54}[a-z0-9])?$`)

// upstreamName is the name a disk or snapshot is created under: name itself when it's a short DNS label, else a
// stable hash of it, so a retry finds the same object. Short enough to name the disk's anchor pod after it.
func upstreamName(name string) string {
	if upstreamNamePattern.MatchString(name) {
		return name
	}
	sum := sha256.Sum256([]byte(name))
	return "devbox-" + hex.EncodeToString(sum[:])[:40]
}

// upstreamParams returns the parameters to pass to the provider.
func upstreamParams(params map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range params {
		if !ownParams[k] {
			out[k] = v
		}
	}
	return out
}

// Volume names come from Substrate (substrate-<actor uid>-<volume>) and seeds from the operator
// (<atespace>.<template>). Both name ConfigMaps, so they must be DNS subdomains.
var validName = regexp.MustCompile(`^[a-z0-9]([-a-z0-9.]{0,200}[a-z0-9])?$`)

func validID(id string) bool { return validName.MatchString(id) }

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

func formatInt(n int64) string { return strconv.FormatInt(n, 10) }

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
