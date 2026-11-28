# Devbox homes on cloud block storage

Status: implemented for any CSI disk provider the cluster runs (driver, chart, operator, gateway); not yet run on a
cluster. Nov 27, 2026. `Block` is now the default `spec.home.storage`, and `Snapshot` the only other value it
accepts (for machines without cloud disks); the operator keeps its JuiceFS and ZeroFS code paths, which the API no
longer reaches, so they can come back.

## Summary

Move devbox homes (`/home/dev`) from ZeroFS to plain cloud block storage: one EBS, Persistent Disk or Azure
managed disk per box, with ext4 mounted by the node's kernel. Substrate already attaches and detaches CSI volumes
on every resume and suspend, so it needs no changes. Two gaps have to be closed on our side:

- **Zones.** Cloud disks live in one zone. Substrate creates volumes with no topology, and its scheduler doesn't
  know where a volume lives. We pin each box to its home's zone with zone-labelled WorkerPools and the actor's own
  `worker_selector`.
- **Golden seeds.** New homes start from the golden boot's home. The driver captures that home as a disk snapshot
  and creates every later home from it, the same way the ZeroFS driver's `seed` parameter works today.

The disks come from the CSI driver for disks the cluster already runs (the EBS, PD or Azure Disk driver, or any
other that attaches and snapshots disks), which our driver uses through Kubernetes objects alone, so it installs
no cloud driver and holds no cloud credentials. A later upstream Substrate change (a pull request, not a fork)
would make volume zones part of scheduling and remove most of the zone plumbing.

## Why

Homes have moved from JuiceFS to ZeroFS, and both have failed in production in ways that are hard to see and hard
to recover from. Recent examples:

- A metadata-heavy job made ZeroFS flush so often that its metadata backlog hit the 256-file limit, and writes to
  the home stalled. The gateway never remounted, because it relies on the daemon's event stream, which lives on
  that same home. Separately, a full home left torn records in the event log.
- **windy-sequoia:** one of ZeroFS's four NBD connections stopped answering for exactly 10 minutes (the kernel's
  `io_timeout`), from 18:32:33 to 18:42:33 UTC, with no error logged. Every write to the home froze, the daemon
  looked dead, and the automatic suspend and resume couldn't finish until the kernel dropped the connection.

Each layer in the path (an LSM tree in object storage, its flushes and compaction, NBD, a userspace server per
volume) is a place for
writes to stall without an error. A cloud disk takes all of that out of the data path. It's replicated by the
cloud within its zone, `fsync` means what databases expect, and a gp3 volume's baseline (3,000 IOPS, 125 MB/s,
both free) suits builds better than an object-storage-backed filesystem.

## What Substrate already does

Substrate's external volumes (preview gate `ExternalVolumes`, which ZeroFS already uses) cover the lifecycle a
cloud disk needs:

| Step | Substrate call | Where |
|---|---|---|
| Create the volume, on the actor's first resume, before a worker is chosen | `CreateVolume`, named from the actor UID, with the StorageClass's parameters | `cmd/ateapi/internal/controlapi/volumes.go` |
| Attach to the chosen worker's node on every resume | `ControllerPublishVolume`; the response's publish context (for example `devicePath`) is passed to the node | `workflow_resume.go`, `ensureVolumesAttached` |
| Format and mount on the node, then bind into the sandbox | `NodeStageVolume`, `NodePublishVolume` | `internal/volume/csi/plugin.go` |
| Detach on every suspend, revert and delete | `ControllerUnpublishVolume` | `workflow_suspend.go`, `ensureVolumesDetached` |
| Delete with the actor | `DeleteVolume` | `workflow_delete.go` |

The sandbox side doesn't change: the node plugin mounts the disk on the host under `/var/lib/ate`, and the worker
bind-mounts it into gVisor exactly as it does a ZeroFS home today.

What Substrate does **not** do:

- **No topology.** `CreateVolume` carries no `AccessibilityRequirements`, and nothing reads a node's accessible
  topology. With no topology, the EBS driver always uses the first zone `DescribeAvailabilityZones` returns.
  devbox-dev's devbox nodes span us-east-2a, 2b and 2c.
- **No content source.** `CreateVolume` carries no `VolumeContentSource`, so a stock driver can't start a home
  from a snapshot.
- **No expansion.** Substrate never calls `ControllerExpandVolume` or `NodeExpandVolume`.
- **No golden tag clones** for templates with external volumes. This is why homes are seeded by the driver today
  (`internal/controller/devboxrunner_home.go`).

## Design

### Storage type

Add a fourth `DevboxHomeStorage`, `Block`, next to `Snapshot`, `JuiceFS` and `ZeroFS`. Like the other external
types, changing a runner to it rolls a new revision whose instances start with fresh homes. `spec.home.size` sets
the disk size and defaults to `spec.resources.disk`. The StorageClass defaults to the chart's `devbox-block`,
whose extra parameters (such as `type: gp3`) pass through to the provider. `ensureHomeStorageClass` copies it per
revision with the revision's seed, plus `group` (the runner's atespace) and `size` (the revision's home size) so
homes can grow (see Growing a home). It refuses to roll a revision while the driver's preflight of the provider,
reported on the StorageClass, hasn't passed. A Block home takes none of the worker node's disk budget.

### Driver

The driver is `block.devbox.plural.sh` (`pkg/devbox/block`, binary `cmd/devbox-block`, installed by the
agent-substrate chart's `block.enabled`). Its disks come from the provider, the CSI driver for disks the cluster
already runs, named by `block.provider` or else the provisioner of the cluster's default StorageClass.

**How Substrate reaches CSI drivers.** Substrate's components run in their own pods, so they can't use a driver's
sockets the way the kubelet does. ate-api-server dials the `controllerEndpoint` of the driver's `CSIDriverConfig`,
which must be `tcp://` or `dns://`, optionally with mTLS from pod identity certificates. atelet dials the node
plugin's Unix socket on its own host, by default `/var/lib/kubelet/plugins/<driver>/csi.sock`. Substrate's own
examples expose a driver's controller by patching a socat or Envoy sidecar into the driver's pod, which can't be
done to a managed add-on such as EKS's EBS driver or GKE's PD driver. And even with a socket, the provider's node
plugin stages and publishes under the kubelet's directory, not `/var/lib/ate`, and Substrate never passes a zone
or a snapshot. So our driver sits between Substrate and the provider, and talks to the provider the way pods do:

**Controller.** Substrate's ate-api-server reaches it over mTLS on port 9830, using pod identity certificates.
Substrate creates volumes before it chooses a worker (see Zones), so:

- `CreateVolume` only records the volume (name, size, StorageClass parameters, seed, group) and creates no disk.
- `ControllerPublishVolume` creates the disk on the volume's first attach: a PersistentVolumeClaim in the driver's
  namespace, on a StorageClass of the provider the controller creates for the volume's parameters
  (`WaitForFirstConsumer`, expandable, ext4), with the attaching node as its `volume.kubernetes.io/selected-node`
  and the seed's VolumeSnapshot as its data source. The provider's own provisioner creates the disk where that
  node can reach it. To attach, the controller runs an anchor pod on the node that mounts the claim: the kubelet
  and the provider's node plugin attach, format and mount the disk as for any pod. The controller returns once the
  disk's VolumeAttachment reports it attached, with where the kubelet will mount it
  (`pods/<uid>/volumes/kubernetes.io~csi/<pv>/mount`) in the publish context. The kubelet mounts a pod's volumes
  before it creates the pod's sandbox and starts its container, so the node plugin waits for that mount at
  `NodeStageVolume` instead of the controller waiting for the anchor to run. A later attach to a node the
  volume's node affinity doesn't admit moves the disk (see Zones).
- `ControllerUnpublishVolume` deletes the anchor and waits until the disk's VolumeAttachment for that node is gone,
  using the last recorded node if Substrate doesn't name one.
- `DeleteVolume` captures the seed when the volume is its seed's golden volume (see Seeds), then deletes the anchor
  and the claim; the provider deletes the disk once it's detached.

Waiting on the provider (provisioning, an attach, the kubelet's mount, a detach, a snapshot) is bounded by `--disk-wait`
(two minutes). A call that gives up returns `Unavailable` and the next one continues where it left off, since
every object is named after the volume.

The anchor pod exists because the attach/detach controller owns VolumeAttachments: at startup it marks any
attachment whose volume no pod uses as uncertain and detaches it, so a bare VolumeAttachment would be detached
under a running box. A pod that uses the claim keeps it attached for as long as the pod runs. Anchors run
`devbox-block --mode=anchor`, which waits for SIGTERM, tolerate every taint, and request almost nothing. Clusters
often run admission policies (Gatekeeper, Kyverno, Pod Security admission), so an anchor's defaults pass the
restricted Pod Security Standard and the commonly shipped rules: CPU and memory requests and limits, exec probes,
a non-root user with a read-only root filesystem and no capabilities, no host namespaces, standard labels, and a
ServiceAccount without a token. A partial Pod from `--anchor-template` (the chart's `block.anchor` values) is
merged over the defaults as a strategic merge patch, for the labels, annotations, priority class, resources or
anything else a cluster's policies want; the pod's name, node, image, args and claim are set again after it.

Volume and seed records are ConfigMaps in the driver's namespace, one per record, labelled
`devboxes.plural.sh/block-record`.

**Preflight.** Before it serves, and every five minutes, the controller checks that the provider's CSIDriver exists,
attaches its volumes (`attachRequired` isn't false) and serves persistent volumes; that the cluster serves
`snapshot.storage.k8s.io/v1`; and it picks the provider's default VolumeSnapshotClass, or creates
`devbox-block.<provider>`. It warns when no node's CSINode lists the provider. It writes the result to the
`block.devbox.plural.sh/provider` and `block.devbox.plural.sh/preflight` annotations of its StorageClass, where the
operator reads it, and its `/healthz` fails until the check passes.

**Node: a bind-mount plugin.** It runs on devbox nodes only, privileged, with `/var/lib/ate` mounted `Bidirectional`
and `/var/lib/kubelet` mounted `HostToContainer`. `CSIDriverConfig.spec.nodeSocketOverride` names its socket at
`/var/lib/kubelet/plugins/block.devbox.plural.sh/csi.sock`. There's no kubelet registrar, so the kubelet never
calls it. `NodeStageVolume` bind-mounts the anchor's mount from the publish context to atelet's staging path,
then hands a fresh ext4 home to the dev user (uid, gid and mode from the StorageClass) and removes the empty
`lost+found`. `NodePublishVolume` bind-mounts the staging path to the target. `NodeGetInfo` reports the Kubernetes
node name, which is the ID Substrate attaches by. It needs no Kubernetes API access.

### Zones

The zone is chosen once, when the gateway creates the instance's actor:

1. A Block runner gets one WorkerPool per zone (`devbox-<runner>-<zone>`), labelled
   `devboxes.plural.sh/zone=<zone>` and pinned to that zone's nodes with `topology.kubernetes.io/zone` in the
   template's `nodeSelector`. Every pool also carries the runner's worker-selector label, so the template's
   `workerSelector` is unchanged. The zones are `spec.workerPool.zones` when set. Otherwise the operator finds
   them on every pass: the `topology.kubernetes.io/zone` of the nodes matching `spec.workerPool.nodeSelector`, or
   of every node while none does, as before an autoscaled pool's first node. A found zone whose nodes all scale
   away stays while it holds homes, so its boxes resume there rather than moving. Nodes without a zone (kind, k3s)
   leave a single pool. The result is `status.zones`, which the gateway places by. Nodes come from the operator's
   cached Node informer (the metrics scraper already runs it), so finding zones costs no API calls; a Node watch
   reconciles a runner only when a node event changes the zones it would find, not on every node that joins.
2. The gateway picks a zone for each new instance (see "Placement packs zones" below), sets the actor's
   `worker_selector` to that zone's label when it creates the actor, and keeps the zone in the instance record.
   Substrate ANDs the actor's selector with the template's on every resume.
3. On the first resume, Substrate's `CreateVolume` only records the volume. Substrate then picks a worker from the
   zone's pool, and the proxy creates the disk in that worker's zone at `ControllerPublishVolume`. The disk and its
   box can't end up in different zones.

Golden boots, probes and warm actors aren't pinned, and they don't need to be: each runs once, so its disk is
created wherever it first runs. The seed snapshot the golden boot leaves behind is regional, so it seeds every
zone. Substrate runs golden boots itself, so the gateway couldn't pin them anyway. For a warm actor, this costs one
disk created from the seed and deleted per warm boot.

Dropping a zone from the runner's zones keeps its pool while it still holds homes, so those boxes can resume,
but no new box goes there. Once it holds none, the pool is deleted. Moving a runner from one pool to zones keeps
the old pool, unscaled, until no instance runs on it.

**Moving a box to another zone.** When a box resumes after its zone was dropped from the runner's zones, the
gateway picks a zone for it again, as for a new box, and updates the actor's `worker_selector` before resuming it.
The controller then sees an attach to a node that can't reach the disk, and moves it: it snapshots the disk
(`devbox-move-<volume>-<generation>`), creates the next generation's claim from the snapshot for the new node,
and leaves the old disk and the snapshot as garbage it deletes then or on a later collection. Each step is
recorded on the volume, so an attach that gives up while the snapshot is still being taken returns `Unavailable`
and the next one continues. A move takes minutes, and the box's resume may fail a few times before it finishes.
Moving boxes off a zone that is out of capacity or down, without dropping it, is still an operator action.

### Sizing the zonal pools

Today `autoscaleWorkerPool` sizes the runner's single WorkerPool. It runs enough workers for the running instances
plus `spareInstances` free slots, clamped to `minReplicas` and `maxReplicas`. Running that loop once per zonal pool
would multiply the minimum and the spare slots by the number of zones: `minReplicas: 1` would keep three idle
workers, and their nodes, up in a three-zone region.

Instead, the runner's autoscaling settings stay runner-wide totals, and one pass sizes all the zonal pools
together:

1. **Demand.** Each zone runs enough workers for the instances running in it plus the resumes waiting for a worker
   there. A box can only run in its home's zone, so this part is per zone and isn't negotiable.
2. **Spare slots.** `spareInstances` exists so a new box starts without waiting for a worker. Only new boxes can
   use spare capacity wherever it is; a resume needs its own zone. So all spare slots go to the zone the gateway
   will place the next new box in, not to every zone.
3. **Minimum.** If the total from the first two steps is below `minReplicas`, the difference goes only to zones
   that already hold homes, starting with the zone holding the most and taking turns one worker at a time. Zones
   with no homes get no floor. If no zone has homes yet, the minimum goes to the placement zone.
4. **Maximum.** `maxReplicas` caps the total across zones. At the cap, waiting resumes come before spare slots.

Scaling down stays per pool and works as it does today: only idle workers are drained, after `ScaleDownDelay`. A
zone with no running boxes and no share of the minimum scales to zero.

So with `minReplicas: 1`, one worker runs, in the zone with the most homes. With `minReplicas: 3` and homes in two
zones, those two zones get two workers and one.

**Placement packs zones.** The gateway places a new box in the zone with free slots that already holds the most
homes, and opens another zone only when that one is out of capacity. Packing keeps most boxes behind the minimum
and spare workers. It gives up spreading boxes for zone resilience, which the zone-move path covers.

**Cold zones.** The trade-off is that resuming a box whose zone has no worker waits for a new worker, and often a
new node: minutes instead of seconds. The autoscaler has to see that demand, and the actors can't show it. When no
worker has room, Substrate rejects `ResumeActor` with `ResourceExhausted` before the actor leaves `SUSPENDED`, and
actors carry no labels. So the gateway records it instead:

- While a pinned actor's resume keeps getting `ResourceExhausted`, the gateway writes an entry
  (`actor → zone, since, last seen`) into the atespace's ConfigMap, `devbox-zone-demand.<atespace>`, in its own
  namespace (`pkg/devbox/zones`).
- It keeps retrying until the wake's `ReadyTimeout` instead of the one-minute capacity wait, and removes the
  entry when the resume succeeds or gives up. Entries not refreshed for 15 minutes are ignored, in case a gateway
  dies mid-wait.
- The autoscaler counts the entries of actors that still aren't running as waiting demand in their zone.

The runner's capacity status has a per-zone breakdown (workers, desired workers, homes, running and waiting
instances) next to the totals. `status.workerPoolZones` lists the zonal pools, which the gateway uses to map
workers to zones when it counts free slots.

### Node autoscaling

The zonal pools reach the cloud only through pending worker pods with a zone `nodeSelector`, so whether a node
appears in the right zone depends on the node autoscaler:

- **Karpenter and GKE** honour the zone natively. Karpenter launches into the required zone if the NodePool allows
  it. A GKE node pool is one managed instance group per zone, and its Cluster Autoscaler grows the group in the
  pod's zone.
- **Cluster Autoscaler on EKS (and AKS)** needs one node group per zone. A managed node group spanning zones is one
  autoscaling group whose template zone is arbitrary, so scale-up can launch the node in the wrong zone and leave
  the worker pending. Run one group per zone with `--balance-similar-node-groups`. For groups that scale from
  zero, tag them with their labels and taints.
- **Node group minimums** should be 0. The runner-wide `minReplicas` already decides which zone keeps warm
  workers, and a per-group minimum would bring back the multiplied floor this section avoids.
- **Scale-down** needs no changes. Workers carry `safe-to-evict: "false"` and `karpenter.sh/do-not-disrupt`, and the
  operator only drains idle ones. Anchors live only on nodes whose workers run boxes. Rolling node upgrades (an EKS
  managed node group update, GKE surge upgrades) ignore those annotations and force evictions after their
  timeout, so plan upgrades around running boxes.
- **Anchor admission.** Anchors are placed with `nodeName`, so neither the scheduler nor the autoscaler accounts for
  them. Kubelet admission still does: leave each node room for one anchor per instance slot (pod count, IPs, and
  the anchor's small requests) beyond the worker's requests, or attaches fail with `OutOfpods` or `OutOfcpu`.
  Autoscalers don't model disk attach limits either, so instance slots per worker must stay under the node's limit
  (see Clouds).

### Seeds

The first volume created for a seed claims it and is the golden boot's home, as it is with ZeroFS. When Substrate
deletes the golden actor after tagging it, the controller snapshots that disk with a VolumeSnapshot of its claim
(named after the seed, so a retry finds the same snapshot), waits until it's ready, and records it on the
seed before deleting the disk. A golden volume that never got a disk gives up its claim. Every later disk for the
seed is created from that snapshot. Volumes recorded before the snapshot existed pick it up at their first attach.

The controller collects seeds every 10 minutes. It deletes the snapshot of any seed that no StorageClass of
the driver names, unless a volume that has no disk yet still needs it. Deleting a revision's StorageClass is
therefore enough to free its seed.

On EBS, `block.parameters.volumeInitializationRate` makes a disk created from a snapshot hydrate at a known speed
instead of fetching blocks lazily on first read.

### Growing a home

Substrate creates a volume once and never expands it, and a box keeps its volume across revisions. So each
revision's StorageClass carries the runner's atespace as `group` and its home size as `size`, and at every attach
the controller grows the disk to the largest `size` of any StorageClass of the driver in its group, by raising its
claim's request. The provider's resizer grows the disk and the kubelet grows the filesystem when the anchor mounts
it. Homes only grow; lowering `spec.home.size` affects new homes only.

### Container storage

Substrate carries a box's root filesystem changes in every snapshot (on microVM, as a tar of the rootfs upper
layer), and the devbox images keep Podman's images,
containers and volumes there by default, with the `vfs` driver, which stores every layer as a full copy. A few
compose stacks can make every suspend and resume carry gigabytes. With a Block home, the operator sets
`CONTAINERS_STORAGE_CONF=/etc/containers/storage.home.conf`, which keeps that storage at
`/home/dev/.local/share/containers/storage` instead. Snapshots shrink to the box's own changes, images survive new
images of the box, and images the golden boot pulls ship in the seed. The costs:

- Images count against `spec.home.size`, and `vfs` duplicates layers, so homes need more room than before.
- Images built from a custom base need the same file, or need to set `CONTAINERS_STORAGE_CONF` themselves through
  `spec.env`. The operator leaves the variable out when `spec.env` sets it.
- ZeroFS and JuiceFS homes keep the root filesystem, because every fsync there is an object-storage round trip. A
  Snapshot home is snapshotted with the root filesystem anyway.

### Backups

A cloud disk is replicated within its zone, not across zones. A scheduled snapshot policy (EBS Data Lifecycle
Manager, or the same in the proxy) gives each home a recent off-zone copy. Zone moves use the same snapshots.

## Clouds

| Cloud | Driver | Zones | Disks per VM | Verdict |
|---|---|---|---|---|
| AWS | `ebs.csi.aws.com`, gp3 | single zone; per-zone pools required | 50 on `c8id.4xlarge` (dedicated limit); 28 shared with ENIs and instance store on older Nitro types | good |
| GCP | `pd.csi.storage.gke.io`, Hyperdisk Balanced or pd-balanced | zonal, or replicated across two zones (Hyperdisk Balanced High Availability, regional PD) | 127 | best |
| Azure | `disk.csi.azure.com`, Premium or Standard SSD ZRS | ZRS disks attach in any zone, so no pinning | set by VM size; small sizes allow only a handful | zones solved; small VMs cap boxes per node |
| Smaller clouds, on-prem | varies (Ceph RBD, Longhorn, provider drivers) | Ceph has no zones | often low per-VM caps | check per provider |

At four `devbox-large` boxes (4 cores each) per 16-core node, attach limits only matter on Azure's smaller VM sizes
and on providers with single-digit caps.

## Costs

A suspended home is still a billed disk: 20 GiB of gp3 is about $1.60 a month, against roughly $0.46 for the same
data in S3 under ZeroFS. Snapshots for seeds and backups are incremental, at about $0.05 per GiB-month. Volume
initialization at a provisioned rate is billed per GiB; check current pricing before relying on it for every new
home.

## Risks

- **Attach and detach on every resume and suspend.** These are usually seconds on AWS and GCP, but detaches
  occasionally hang for minutes. Substrate runs them synchronously inside suspend and resume. The spike below
  measures this before we build anything.
- **Zone capacity.** Pinning trades flexibility for simplicity. A zone shortage strands its boxes until they're
  moved.
- **Cold zones.** Because the minimum isn't repeated in every zone, a box in a zone with no worker resumes in
  minutes, not seconds.
- **Node loss.** A disk attached to a terminated node detaches when the instance is gone; a node that's merely
  unreachable may need a force detach. Substrate's revert path already calls detach.
- **Attach limits.** Substrate places boxes by CPU and memory and doesn't count attached disks, so a worker's
  instance slots (plus the warm actor) must stay under the node type's volume attach limit.
- **Anchor pods.** Each running box has an anchor pod on its node, which counts against the node's pod limit and,
  off the host network by default, takes a pod IP; `block.anchor.hostNetwork` saves the IPs where policies allow
  host-network pods. Deleting an anchor by hand detaches a running box's home; anchors run at `system-node-critical` so the kubelet doesn't evict
  them first.
- **Going through Kubernetes.** Every attach goes through the attach/detach controller and the kubelet, and every
  detach waits for the anchor to stop, the kubelet to report the disk unmounted (it does so with its node status,
  every 10 seconds by default) and the attach/detach controller to detach it. That adds about a second to an
  attach and several seconds to a detach over calling the cloud directly. In exchange the driver works with any
  disk provider's own install, managed add-ons included. Dropping the anchor would mean a VolumeAttachment with an
  inline volume spec, which the attach/detach controller leaves alone, and the node plugin calling the provider's
  node plugin itself in place of the kubelet. That path is only exercised by in-tree volume migration, and
  standing in for the kubelet means handling each provider's node-stage secrets and staging layout, so it isn't
  worth it for portability. It could be an opt-in for the big clouds' disks.
- **A full disk still breaks the box.** That's a separate problem: the daemon should report a full home rather than
  go quiet.

## Plan

1. **Spike (devbox-dev).** Create, attach, detach and re-attach a gp3 volume about 20 times. Record p50 and p99
   attach and detach times and any stuck detaches. Also time first reads from a disk created from a 20 GiB snapshot,
   with and without an initialization rate.
2. **Driver.** Built: controller and node plugin over any installed CSI disk provider, provider preflight, chart,
   `Block` storage type, seed capture, seeding and seed collection, growth, and cleanup of what moves leave.
3. **Zones.** Built: per-zone WorkerPools, one autoscaling pass that splits the runner's minimum and spare slots
   across them, packed zone choice and `worker_selector` in the gateway, zone demand records, and moving boxes of
   dropped zones.
4. **Upstream Substrate change.** Choose the worker before creating volumes, pass the worker's zone to
   `CreateVolume`, treat a volume's accessible topology as a scheduling constraint on later resumes, and report
   resumes waiting for capacity. Once that lands, the lazy disk creation, the gateway's pinning and the demand
   records can go.
5. **GCP and Azure** need no code: set `block.provider` (or rely on the default StorageClass) and
   `block.parameters`. Each needs a run on a real cluster.

## Open questions

- **Existing ZeroFS homes.** Copy them over with a one-off job (mount both on one node and `rsync`), or let
  instances start fresh on the new revision?
- **Moving zones.** Should a zone move be automatic after N failed resumes, or an operator action?
- **The `Snapshot` home type.** It keeps the home on the node and carries it in every snapshot. Should it stay as
  the fallback for clouds where none of this fits?
