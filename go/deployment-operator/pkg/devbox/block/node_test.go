package block

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type bind struct {
	source   string
	readonly bool
}

// fakeMounter tracks mount points; paths in mounted exist before any Bind, like the kubelet's.
type fakeMounter struct {
	mu     sync.Mutex
	mounts map[string]bind
}

func (m *fakeMounter) Bind(source, target string, readonly bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.mounts[target] = bind{source, readonly}
	return nil
}

func (m *fakeMounter) Unmount(target string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.mounts, target)
	return nil
}

func (m *fakeMounter) IsMounted(path string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.mounts[path]
	return ok, nil
}

const testSource = "pods/0b9f/volumes/kubernetes.io~csi/pvc-1/mount"

func newTestNode(t *testing.T) (*Node, *fakeMounter, string) {
	root := t.TempDir()
	kubelet := filepath.Join(root, "kubelet")
	m := &fakeMounter{mounts: map[string]bind{filepath.Join(kubelet, testSource): {source: "/dev/xvdba"}}}
	return &Node{
		NodeID: "node-a", TargetRoot: filepath.Join(root, "ate"), KubeletRoot: kubelet, Mounter: m, Log: logr.Discard(),
		MountWait: 20 * time.Millisecond, PollInterval: time.Millisecond,
		PrepareHome: func(string, Owner) error { return nil },
	}, m, root
}

func TestNodeStageWaitsForTheKubeletsMount(t *testing.T) {
	n, m, root := newTestNode(t)
	n.MountWait = time.Minute
	source := "pods/0b9f/volumes/kubernetes.io~csi/pvc-2/mount"
	staging := filepath.Join(root, "ate/volumes/a2/staging")
	go func() {
		time.Sleep(10 * time.Millisecond)
		_ = m.Bind("/dev/xvdbb", filepath.Join(n.KubeletRoot, source), false)
	}()
	_, err := n.NodeStageVolume(context.Background(), &csi.NodeStageVolumeRequest{
		VolumeId: "substrate-a2-home", StagingTargetPath: staging, VolumeCapability: mountCapability(),
		PublishContext: map[string]string{PublishContextSource: source},
	})
	if err != nil {
		t.Fatalf("staging should wait for the kubelet to mount the disk: %v", err)
	}
	if ok, _ := m.IsMounted(staging); !ok {
		t.Fatal("staging should bind-mount the disk once it's mounted")
	}
}

func TestNodeBindMountsTheAnchorsMountAndPreparesTheHome(t *testing.T) {
	ctx := context.Background()
	n, m, root := newTestNode(t)
	var prepared []string
	var owner Owner
	n.PrepareHome = func(dir string, o Owner) error { prepared, owner = append(prepared, dir), o; return nil }
	staging := filepath.Join(root, "ate/volumes/a1/staging")
	target := filepath.Join(root, "ate/actors/a1/home")

	stage := &csi.NodeStageVolumeRequest{
		VolumeId:          "substrate-a1-home",
		StagingTargetPath: staging,
		VolumeCapability:  mountCapability(),
		PublishContext:    map[string]string{PublishContextSource: testSource},
		VolumeContext:     map[string]string{ParamUID: "1000", ParamGID: "1000", ParamMode: "750"},
	}
	if _, err := n.NodeStageVolume(ctx, stage); err != nil {
		t.Fatal(err)
	}
	if got := m.mounts[staging].source; got != filepath.Join(n.KubeletRoot, testSource) {
		t.Fatalf("staging should bind-mount the anchor's mount, got %q", got)
	}
	if len(prepared) != 1 || prepared[0] != staging || owner.UID != 1000 || owner.Mode != 0o750 {
		t.Fatalf("the home should be prepared for its owner, got %v %+v", prepared, owner)
	}
	if _, err := n.NodeStageVolume(ctx, stage); err != nil {
		t.Fatalf("staging again should succeed: %v", err)
	}

	publish := &csi.NodePublishVolumeRequest{
		VolumeId: "substrate-a1-home", StagingTargetPath: staging, TargetPath: target, VolumeCapability: mountCapability(),
	}
	if _, err := n.NodePublishVolume(ctx, publish); err != nil {
		t.Fatal(err)
	}
	if got := m.mounts[target]; got.source != staging || got.readonly {
		t.Fatalf("publish should bind-mount the staging path, got %+v", got)
	}
	if _, err := os.Stat(target); err != nil {
		t.Fatalf("publish should create the target: %v", err)
	}

	if _, err := n.NodeUnpublishVolume(ctx, &csi.NodeUnpublishVolumeRequest{VolumeId: "substrate-a1-home", TargetPath: target}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(target); !os.IsNotExist(err) {
		t.Fatal("unpublish should remove the target")
	}
	if _, err := n.NodeUnstageVolume(ctx, &csi.NodeUnstageVolumeRequest{VolumeId: "substrate-a1-home", StagingTargetPath: staging}); err != nil {
		t.Fatal(err)
	}
	if _, ok := m.mounts[staging]; ok || len(m.mounts) != 1 {
		t.Fatalf("unstage should unmount only the staging path, got %v", m.mounts)
	}
}

func TestNodeRefusesWhatIsntItsToMount(t *testing.T) {
	ctx := context.Background()
	n, m, root := newTestNode(t)
	staging := filepath.Join(root, "ate/volumes/a1/staging")
	req := func(source, staging string) *csi.NodeStageVolumeRequest {
		return &csi.NodeStageVolumeRequest{
			VolumeId: "substrate-a1-home", StagingTargetPath: staging, VolumeCapability: mountCapability(),
			PublishContext: map[string]string{PublishContextSource: source},
		}
	}
	for _, source := range []string{"", "/etc", "../../etc/mount", "pods/x/volumes/kubernetes.io~empty-dir/y/mount", "pods/../../../etc/volumes/kubernetes.io~csi/y/mount"} {
		if _, err := n.NodeStageVolume(ctx, req(source, staging)); status.Code(err) != codes.FailedPrecondition {
			t.Fatalf("source %q should fail with FailedPrecondition, got %v", source, err)
		}
	}
	if _, err := n.NodeStageVolume(ctx, req(testSource, "/etc")); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("staging outside the target root should fail with InvalidArgument, got %v", err)
	}
	if _, err := n.NodeStageVolume(ctx, req("pods/other/volumes/kubernetes.io~csi/pvc-2/mount", staging)); status.Code(err) != codes.Unavailable {
		t.Fatalf("a disk the kubelet doesn't mount in time should be Unavailable, got %v", err)
	}
	if _, ok := m.mounts[staging]; ok {
		t.Fatal("nothing should be mounted")
	}
	if _, err := n.NodePublishVolume(ctx, &csi.NodePublishVolumeRequest{
		VolumeId: "substrate-a1-home", StagingTargetPath: staging, TargetPath: filepath.Join(root, "ate/actors/a1/home"), VolumeCapability: mountCapability(),
	}); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("publishing an unstaged volume should fail with FailedPrecondition, got %v", err)
	}

	info, err := n.NodeGetInfo(ctx, &csi.NodeGetInfoRequest{})
	if err != nil || info.GetNodeId() != "node-a" {
		t.Fatalf("node info should report the node name, got %v, %v", info, err)
	}
}

func TestPrepareHome(t *testing.T) {
	t.Run("a fresh home gets its mode and loses an empty lost+found", func(t *testing.T) {
		root := t.TempDir()
		if err := os.Mkdir(filepath.Join(root, lostFound), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := PrepareHome(root, Owner{UID: -1, GID: -1, Mode: 0o750}); err != nil {
			t.Fatal(err)
		}
		st, err := os.Stat(root)
		if err != nil {
			t.Fatal(err)
		}
		if st.Mode().Perm() != 0o750 {
			t.Fatalf("mode = %v, want 0750", st.Mode().Perm())
		}
		if _, err := os.Stat(filepath.Join(root, lostFound)); !os.IsNotExist(err) {
			t.Fatal("an empty lost+found should be removed")
		}
	})

	t.Run("a home with files keeps its mode and a non-empty lost+found", func(t *testing.T) {
		root := t.TempDir()
		if err := os.Chmod(root, 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.MkdirAll(filepath.Join(root, lostFound, "orphan"), 0o700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(root, ".bashrc"), nil, 0o600); err != nil {
			t.Fatal(err)
		}
		if err := PrepareHome(root, Owner{UID: -1, GID: -1, Mode: 0o755}); err != nil {
			t.Fatal(err)
		}
		st, _ := os.Stat(root)
		if st.Mode().Perm() != 0o700 {
			t.Fatalf("a used home's mode changed to %v", st.Mode().Perm())
		}
		if _, err := os.Stat(filepath.Join(root, lostFound)); err != nil {
			t.Fatal("a lost+found holding orphans must stay")
		}
	})
}
