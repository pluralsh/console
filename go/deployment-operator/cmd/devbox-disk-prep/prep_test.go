package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
)

type exitError int

func (e exitError) Error() string { return fmt.Sprintf("exit status %d", int(e)) }
func (e exitError) ExitCode() int { return int(e) }

type result struct {
	out string
	err error
}

type fakeExec struct {
	results map[string]result
	calls   []string
	onMount func(args []string)
}

func (f *fakeExec) Output(_ context.Context, name string, args ...string) ([]byte, error) {
	call := strings.Join(append([]string{name}, args...), " ")
	f.calls = append(f.calls, call)
	if name == "mount" && f.onMount != nil {
		f.onMount(args)
	}
	r, ok := f.results[call]
	if !ok {
		return nil, nil
	}
	return []byte(r.out), r.err
}

func (f *fakeExec) ran(prefix string) bool {
	for _, c := range f.calls {
		if strings.HasPrefix(c, prefix) {
			return true
		}
	}
	return false
}

const labelLookup = "blkid -c /dev/null -o device -t LABEL=ate-data"

const lsblk = `{"blockdevices": [
  {"path": "/dev/nvme0n1", "type": "disk", "ro": false, "model": "Amazon Elastic Block Store", "children": [
    {"path": "/dev/nvme0n1p1", "type": "part", "ro": false, "model": null}
  ]},
  {"path": "/dev/nvme1n1", "type": "disk", "ro": false, "model": "Amazon EC2 NVMe Instance Storage        "},
  {"path": "/dev/nvme2n1", "type": "disk", "ro": false, "model": "Amazon EC2 NVMe Instance Storage"},
  {"path": "/dev/nvme3n1", "type": "disk", "ro": false, "model": "Amazon EC2 NVMe Instance Storage"},
  {"path": "/dev/nvme4n1", "type": "disk", "ro": false, "model": "Amazon Elastic Block Store"},
  {"path": "/dev/sr0", "type": "rom", "ro": true, "model": "Amazon EC2 NVMe Instance Storage"}
]}`

func newPrep(t *testing.T, ex *fakeExec, node *corev1.Node, objects ...runtime.Object) (*prep, *fake.Clientset) {
	t.Helper()
	host := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(host, "var/lib"), 0o755))
	mountinfo := filepath.Join(t.TempDir(), "mountinfo")
	require.NoError(t, os.WriteFile(mountinfo, []byte("22 1 259:1 / / rw,relatime - xfs /dev/nvme0n1p1 rw\n"), 0o644))
	ex.onMount = func(args []string) {
		f, err := os.OpenFile(mountinfo, os.O_APPEND|os.O_WRONLY, 0)
		require.NoError(t, err)
		defer f.Close()
		_, err = fmt.Fprintf(f, "90 22 9:127 / %s rw,noatime - xfs %s rw\n", args[len(args)-1], args[len(args)-2])
		require.NoError(t, err)
	}

	clientset := fake.NewSimpleClientset(append([]runtime.Object{node}, objects...)...)
	return &prep{
		config: config{
			nodeName:     node.Name,
			hostRoot:     host,
			mountPath:    "/var/lib/ate",
			label:        "ate-data",
			diskModel:    "Instance Storage",
			startupTaint: "plural.sh/devbox-disk",
			readyLabel:   "plural.sh/devbox-disk-ready",
			readyFile:    filepath.Join(t.TempDir(), "ready"),
		},
		exec:      ex,
		nodes:     clientset.CoreV1().Nodes(),
		pods:      clientset.CoreV1(),
		mountinfo: mountinfo,
	}, clientset
}

func devboxNode() *corev1.Node {
	return &corev1.Node{
		ObjectMeta: metav1.ObjectMeta{Name: "node-1", Labels: map[string]string{"plural.sh/devbox-pool": "devbox"}},
		Spec: corev1.NodeSpec{Taints: []corev1.Taint{
			{Key: "ate.dev/sandboxClass", Value: "gvisor", Effect: corev1.TaintEffectNoSchedule},
			{Key: "plural.sh/devbox-disk", Value: "pending", Effect: corev1.TaintEffectNoSchedule},
		}},
	}
}

func TestReconcileFormatsMountsAndUntaints(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {err: exitError(blkidNotFound)},
		"lsblk --json --output PATH,TYPE,RO,MODEL": {out: lsblk},
		"blkid -p /dev/nvme1n1":                    {err: exitError(blkidNotFound)},
		"blkid -p /dev/nvme2n1":                    {err: exitError(blkidNotFound)},
		"blkid -p /dev/nvme3n1":                    {out: "/dev/nvme3n1: TYPE=\"ext4\""},
	}}
	p, clientset := newPrep(t, ex, devboxNode())
	ctx := context.Background()

	require.NoError(t, p.reconcile(ctx))
	require.Contains(t, ex.calls, "mdadm --create /dev/md/ate --name=ate --level=0 --raid-devices=2 --run /dev/nvme1n1 /dev/nvme2n1")
	require.Contains(t, ex.calls, "mkfs.xfs -K -L ate-data /dev/md/ate")
	require.Contains(t, ex.calls, "mount -o noatime,prjquota /dev/md/ate "+p.target())
	require.FileExists(t, p.marker())
	require.FileExists(t, p.readyFile)

	node, err := clientset.CoreV1().Nodes().Get(ctx, "node-1", metav1.GetOptions{})
	require.NoError(t, err)
	require.Equal(t, []corev1.Taint{{Key: "ate.dev/sandboxClass", Value: "gvisor", Effect: corev1.TaintEffectNoSchedule}}, node.Spec.Taints)
	require.Equal(t, "true", node.Labels["plural.sh/devbox-disk-ready"])

	ex.calls = nil
	require.NoError(t, p.reconcile(ctx))
	require.Empty(t, ex.calls, "a mounted disk is left alone")
}

func TestReconcileSingleDiskIsNotRaided(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {err: exitError(blkidNotFound)},
		"lsblk --json --output PATH,TYPE,RO,MODEL": {out: `{"blockdevices": [
			{"path": "/dev/nvme1n1", "type": "disk", "ro": "0", "model": "nvme_card"},
			{"path": "/dev/nvme2n1", "type": "disk", "ro": "0", "model": "nvme_card-pd"}
		]}`},
		"blkid -p /dev/nvme1n1": {err: exitError(blkidNotFound)},
		"blkid -p /dev/nvme2n1": {err: exitError(blkidNotFound)},
	}}
	p, _ := newPrep(t, ex, devboxNode())
	p.diskModel = "^nvme_card$"

	require.NoError(t, p.reconcile(context.Background()))
	require.False(t, ex.ran("mdadm --create"))
	require.Contains(t, ex.calls, "mkfs.xfs -K -L ate-data /dev/nvme1n1")
}

func TestReconcileRemountsAfterReboot(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {out: "/dev/md127\n"},
	}}
	p, _ := newPrep(t, ex, devboxNode())
	require.NoError(t, os.WriteFile(p.marker(), nil, 0o644))

	require.NoError(t, p.reconcile(context.Background()))
	require.Contains(t, ex.calls, "mdadm --assemble --scan")
	require.Contains(t, ex.calls, "mount -o noatime,prjquota /dev/md127 "+p.target())
	require.False(t, ex.ran("mkfs.xfs"))
	require.False(t, ex.ran("lsblk"))
}

func TestReconcileNeverClaimsDisksAfterFirstBoot(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {err: exitError(blkidNotFound)},
		"lsblk --json --output PATH,TYPE,RO,MODEL": {out: lsblk},
	}}
	p, _ := newPrep(t, ex, devboxNode())
	require.NoError(t, os.WriteFile(p.marker(), nil, 0o644))

	require.NoError(t, p.reconcile(context.Background()))
	require.False(t, ex.ran("lsblk"), "volumes attached after the first boot are never formatted")
	require.False(t, ex.ran("mount"))
	require.FileExists(t, p.readyFile)
}

func TestReconcileWithoutDiskModelStaysOnBootDisk(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {err: exitError(blkidNotFound)},
	}}
	p, clientset := newPrep(t, ex, devboxNode())
	p.diskModel = ""

	require.NoError(t, p.reconcile(context.Background()))
	require.False(t, ex.ran("lsblk"))
	require.False(t, ex.ran("mount"))
	node, err := clientset.CoreV1().Nodes().Get(context.Background(), "node-1", metav1.GetOptions{})
	require.NoError(t, err)
	require.Len(t, node.Spec.Taints, 1)
}

func TestReconcileRestartsPodsStartedBeforeTheMount(t *testing.T) {
	early := metav1.NewTime(time.Now().Add(-time.Hour).Truncate(time.Second))
	pod := func(name, node, hostPath string) *corev1.Pod {
		return &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "ns"},
			Spec: corev1.PodSpec{NodeName: node, Volumes: []corev1.Volume{{
				Name: "host", VolumeSource: corev1.VolumeSource{HostPath: &corev1.HostPathVolumeSource{Path: hostPath}},
			}}},
			Status: corev1.PodStatus{StartTime: &early},
		}
	}
	ex := &fakeExec{results: map[string]result{labelLookup: {out: "/dev/md127"}}}
	p, clientset := newPrep(t, ex, devboxNode(),
		pod("worker", "node-1", "/var/lib/ate"),
		pod("nested", "node-1", "/var/lib/ate/workers/"),
		pod("sibling", "node-1", "/var/lib/ate-other"),
		pod("disk-prep", "node-1", "/"),
		pod("elsewhere", "node-2", "/var/lib/ate"),
	)
	require.NoError(t, os.WriteFile(p.marker(), nil, 0o644))
	ctx := context.Background()

	require.NoError(t, p.reconcile(ctx))
	pods, err := clientset.CoreV1().Pods("ns").List(ctx, metav1.ListOptions{})
	require.NoError(t, err)
	names := make([]string, 0, len(pods.Items))
	for _, p := range pods.Items {
		names = append(names, p.Name)
	}
	require.ElementsMatch(t, []string{"sibling", "disk-prep", "elsewhere"}, names)

	late := metav1.NewTime(time.Now().Add(time.Hour))
	replacement := pod("worker", "node-1", "/var/lib/ate")
	replacement.Status.StartTime = &late
	_, err = clientset.CoreV1().Pods("ns").Create(ctx, replacement, metav1.CreateOptions{})
	require.NoError(t, err)
	require.NoError(t, p.reconcile(ctx))
	_, err = clientset.CoreV1().Pods("ns").Get(ctx, "worker", metav1.GetOptions{})
	require.NoError(t, err, "a pod started after the mount is kept")
}

func TestReconcileKeepsTaintWhenMountFails(t *testing.T) {
	ex := &fakeExec{results: map[string]result{
		labelLookup: {out: "/dev/md127"},
	}}
	p, clientset := newPrep(t, ex, devboxNode())
	ex.onMount = nil
	ex.results["mount -o noatime,prjquota /dev/md127 "+p.target()] = result{err: exitError(32)}

	require.Error(t, p.reconcile(context.Background()))
	node, err := clientset.CoreV1().Nodes().Get(context.Background(), "node-1", metav1.GetOptions{})
	require.NoError(t, err)
	require.Len(t, node.Spec.Taints, 2)
	require.NoFileExists(t, p.readyFile)
}
