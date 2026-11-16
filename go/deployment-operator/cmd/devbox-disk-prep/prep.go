package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	typedcorev1 "k8s.io/client-go/kubernetes/typed/core/v1"
	"k8s.io/client-go/util/retry"
	"k8s.io/klog/v2"
)

const raidDevice = "/dev/md/ate"

const readyLabelValue = "true"

// blkidNotFound is blkid's exit code when no device or signature matches.
const blkidNotFound = 2

type config struct {
	nodeName     string
	hostRoot     string
	mountPath    string
	label        string
	diskModel    string
	startupTaint string
	readyLabel   string
	readyFile    string
	interval     time.Duration
}

type executor interface {
	// Output runs a command and returns its stdout. A non-zero exit is returned as an error with an ExitCode method.
	Output(ctx context.Context, name string, args ...string) ([]byte, error)
}

type osExec struct{}

func (osExec) Output(ctx context.Context, name string, args ...string) ([]byte, error) {
	var stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil && stderr.Len() > 0 {
		return out, fmt.Errorf("%s %s: %w: %s", name, strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}
	return out, err
}

type prep struct {
	config
	exec      executor
	nodes     typedcorev1.NodeInterface
	mountinfo string
}

func (p *prep) loop(ctx context.Context) {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		if err := p.reconcile(ctx); err != nil {
			klog.ErrorS(err, "preparing devbox disk", "node", p.nodeName)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// reconcile is idempotent and re-run on an interval: node pool taints can be re-applied by the cloud (e.g. a GKE
// or AKS node pool update), and a reboot needs the array reassembled and remounted.
func (p *prep) reconcile(ctx context.Context) error {
	if err := p.ensureMounted(ctx); err != nil {
		return err
	}
	if err := p.ensureUntainted(ctx); err != nil {
		return err
	}
	return os.WriteFile(p.readyFile, nil, 0o644)
}

func (p *prep) target() string {
	return filepath.Join(p.hostRoot, p.mountPath)
}

// marker records that disks were claimed on this boot disk, so CSI volumes attached later are never formatted.
func (p *prep) marker() string {
	return filepath.Join(p.hostRoot, "var/lib/plural-devbox-disk-prep")
}

func (p *prep) ensureMounted(ctx context.Context) error {
	target := p.target()
	if err := os.MkdirAll(target, 0o755); err != nil {
		return err
	}
	mounted, err := isMountPoint(p.mountinfo, target)
	if err != nil || mounted {
		return err
	}

	// Reassembles the RAID0 after a reboot; nothing to assemble is not an error.
	_, _ = p.exec.Output(ctx, "mdadm", "--assemble", "--scan")

	dev, err := p.labelled(ctx)
	if err != nil {
		return err
	}
	if dev == "" {
		if _, err := os.Stat(p.marker()); err == nil {
			return nil
		}
		if dev, err = p.format(ctx); err != nil {
			return err
		}
		if err := os.WriteFile(p.marker(), nil, 0o644); err != nil {
			return err
		}
		if dev == "" {
			klog.InfoS("no data disks match, staying on the boot disk", "model", p.diskModel, "path", p.mountPath)
			return nil
		}
	}

	if _, err := p.exec.Output(ctx, "mount", "-o", "noatime,prjquota", dev, target); err != nil {
		return err
	}
	klog.InfoS("mounted data disk", "device", dev, "path", p.mountPath)
	return nil
}

// format claims every candidate disk and returns the formatted device, or "" when there is none.
func (p *prep) format(ctx context.Context) (string, error) {
	disks, err := p.candidates(ctx)
	if err != nil || len(disks) == 0 {
		return "", err
	}

	dev := disks[0]
	if len(disks) > 1 {
		args := append([]string{"--create", raidDevice, "--name=ate", "--level=0", fmt.Sprintf("--raid-devices=%d", len(disks)), "--run"}, disks...)
		if _, err := p.exec.Output(ctx, "mdadm", args...); err != nil {
			return "", err
		}
		dev = raidDevice
	}

	klog.InfoS("formatting data disk", "device", dev, "disks", disks)
	if _, err := p.exec.Output(ctx, "mkfs.xfs", "-K", "-L", p.label, dev); err != nil {
		return "", err
	}
	return dev, nil
}

func (p *prep) labelled(ctx context.Context) (string, error) {
	out, err := p.exec.Output(ctx, "blkid", "-c", "/dev/null", "-o", "device", "-t", "LABEL="+p.label)
	if exitCode(err) == blkidNotFound {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return firstLine(out), nil
}

type blockDevice struct {
	Path     string        `json:"path"`
	Type     string        `json:"type"`
	RO       flexBool      `json:"ro"`
	Model    string        `json:"model"`
	Children []blockDevice `json:"children"`
}

// candidates are whole, writable, unpartitioned disks without any filesystem or RAID signature whose model
// matches diskModel.
func (p *prep) candidates(ctx context.Context) ([]string, error) {
	if p.diskModel == "" {
		return nil, nil
	}
	model, err := regexp.Compile(p.diskModel)
	if err != nil {
		return nil, fmt.Errorf("invalid disk model regex: %w", err)
	}

	out, err := p.exec.Output(ctx, "lsblk", "--json", "--output", "PATH,TYPE,RO,MODEL")
	if err != nil {
		return nil, err
	}
	var listing struct {
		BlockDevices []blockDevice `json:"blockdevices"`
	}
	if err := json.Unmarshal(out, &listing); err != nil {
		return nil, fmt.Errorf("parsing lsblk output: %w", err)
	}

	var disks []string
	for _, d := range listing.BlockDevices {
		if d.Type != "disk" || bool(d.RO) || len(d.Children) > 0 || !model.MatchString(strings.TrimSpace(d.Model)) {
			continue
		}
		_, err := p.exec.Output(ctx, "blkid", "-p", d.Path)
		switch exitCode(err) {
		case blkidNotFound:
			disks = append(disks, d.Path)
		case 0:
		default:
			return nil, err
		}
	}
	return disks, nil
}

func (p *prep) ensureUntainted(ctx context.Context) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		node, err := p.nodes.Get(ctx, p.nodeName, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if !untaint(node, p.startupTaint, p.readyLabel) {
			return nil
		}
		if _, err := p.nodes.Update(ctx, node, metav1.UpdateOptions{}); err != nil {
			return err
		}
		klog.InfoS("marked node disk ready", "node", p.nodeName, "taint", p.startupTaint)
		return nil
	})
}

// untaint drops the startup taint and sets the ready label, reporting whether the node changed.
func untaint(node *corev1.Node, taint, label string) bool {
	changed := false
	taints := node.Spec.Taints[:0]
	for _, t := range node.Spec.Taints {
		if t.Key == taint {
			changed = true
			continue
		}
		taints = append(taints, t)
	}
	node.Spec.Taints = taints

	if node.Labels[label] != readyLabelValue {
		if node.Labels == nil {
			node.Labels = map[string]string{}
		}
		node.Labels[label] = readyLabelValue
		changed = true
	}
	return changed
}

func isMountPoint(mountinfo, path string) (bool, error) {
	f, err := os.Open(mountinfo)
	if err != nil {
		return false, err
	}
	defer f.Close()

	path = filepath.Clean(path)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		// mountinfo(5): the fifth field is the mount point, with spaces escaped as \040.
		fields := strings.Fields(scanner.Text())
		if len(fields) > 4 && strings.ReplaceAll(fields[4], `\040`, " ") == path {
			return true, nil
		}
	}
	return false, scanner.Err()
}

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	var coded interface{ ExitCode() int }
	if errors.As(err, &coded) {
		return coded.ExitCode()
	}
	return -1
}

func firstLine(out []byte) string {
	line, _, _ := strings.Cut(strings.TrimSpace(string(out)), "\n")
	return strings.TrimSpace(line)
}

// flexBool accepts lsblk's booleans, which are "0"/"1" strings before util-linux 2.37.
type flexBool bool

func (b *flexBool) UnmarshalJSON(data []byte) error {
	switch strings.Trim(string(data), `"`) {
	case "true", "1":
		*b = true
	case "false", "0", "null", "":
		*b = false
	default:
		return fmt.Errorf("invalid boolean %s", data)
	}
	return nil
}
