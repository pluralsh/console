package zerofs

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/go-logr/logr"
)

const (
	pollInterval = 100 * time.Millisecond
	// writerStartTimeout covers opening a database that's large or far away.
	writerStartTimeout = 2 * time.Minute
	// writerExitGrace is how long a writer may take to flush what it holds to object storage on SIGTERM.
	writerExitGrace = 2 * time.Minute
	mountTimeout    = 30 * time.Second
	exitGrace       = 10 * time.Second

	configFile = "config.toml"
	deviceFile = "device"
	cacheDir   = "cache"
)

var nbdDevice = regexp.MustCompile(`^/dev/nbd[0-9]+$`)

// Manager stages volumes on this node, one writer, NBD device and ext4 mount per volume. The writers are its child
// processes: restarting the plugin ends them and with them every home it served on the node.
type Manager struct {
	// Binary is the zerofs binary, NBDClient nbd-client, and Blkid, Mkfs and Resize the e2fsprogs/util-linux tools.
	Binary    string
	NBDClient string
	Blkid     string
	Mkfs      string
	Resize    string
	// NBDClientFlags follow the export in every nbd-client call that attaches a device, e.g. -connections 4.
	NBDClientFlags []string
	Storage        Storage
	// ObjectStoreOptions are object_store settings for every writer, such as allow_http for an in-cluster endpoint.
	ObjectStoreOptions map[string]string
	// StateRoot holds each volume's config, cache and attached device, on the node's disk.
	StateRoot string
	// SocketDir holds each writer's sockets and the device-creation mount. It must not propagate to the host,
	// and its paths must fit a Unix socket address.
	SocketDir string
	Cache     CacheConfig
	// MountOptions are the ext4 mount's data options, such as discard, which returns freed blocks to the bucket.
	MountOptions string
	Mountinfo    string
	SysBlock     string
	Log          logr.Logger

	mu      sync.Mutex
	writers map[string]*process
	// attach serializes choosing a free NBD device and connecting it.
	attach sync.Mutex
}

type process struct {
	cmd      *exec.Cmd
	done     chan struct{}
	err      error
	stopping bool
}

func (m *Manager) stateDir(id string) string { return filepath.Join(m.StateRoot, id) }

// socketDir is keyed by a hash of the id: a socket path must fit in 108 bytes and ids may be 192.
func (m *Manager) socketDir(id string) string {
	sum := sha256.Sum256([]byte(id))
	return filepath.Join(m.SocketDir, hex.EncodeToString(sum[:8]))
}

func (m *Manager) Stage(ctx context.Context, v Volume, staging string) (err error) {
	if ok, err := m.Mounted(staging); err != nil {
		return err
	} else if ok {
		if m.writer(v.ID) != nil {
			return nil
		}
		// A mount without a writer is a leftover of an earlier plugin run whose device is gone.
		m.Log.Info("detaching a stale staging mount", "volume", v.ID, "staging", staging)
		if err := detach(staging); err != nil {
			return fmt.Errorf("detaching the stale mount at %s: %w", staging, err)
		}
	}

	defer func() {
		if err != nil {
			if cerr := m.Unstage(context.WithoutCancel(ctx), v.ID, staging); cerr != nil {
				m.Log.Error(cerr, "cleaning up a failed stage", "volume", v.ID)
			}
		}
	}()
	sockets, err := m.startWriter(ctx, v.ID)
	if err != nil {
		return err
	}
	grown, err := m.ensureDevice(ctx, v, sockets)
	if err != nil {
		return err
	}
	dev, err := m.attachDevice(ctx, v.ID, sockets.nbd)
	if err != nil {
		return err
	}
	formatted, err := m.formatIfBlank(ctx, dev)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(staging, 0o750); err != nil {
		return fmt.Errorf("creating the staging directory: %w", err)
	}
	if err := mountExt4(dev, staging, m.MountOptions); err != nil {
		return fmt.Errorf("mounting %s at %s: %w", dev, staging, err)
	}
	if formatted {
		if err := v.Owner.apply(staging); err != nil {
			return err
		}
	} else if grown {
		if _, err := m.run(ctx, m.Resize, dev); err != nil {
			return err
		}
	}
	m.Log.Info("serving volume", "volume", v.ID, "device", dev, "formatted", formatted, "grown", grown)
	return nil
}

// Unstage stops serving a volume, in the reverse order of Stage: unmount, which writes back the page cache,
// then disconnect the device, then stop the writer, which flushes to object storage.
func (m *Manager) Unstage(ctx context.Context, id, staging string) error {
	var errs []error
	if ok, err := m.Mounted(staging); err != nil {
		errs = append(errs, err)
	} else if ok {
		if err := unmount(staging); err != nil {
			errs = append(errs, fmt.Errorf("unmounting %s: %w", staging, err))
		}
	}
	if err := m.detachDevice(ctx, id); err != nil {
		errs = append(errs, err)
	}
	if p := m.takeWriter(id); p != nil {
		stop(p, writerExitGrace)
		if p.err != nil && !isSignaled(p.err) {
			m.Log.Error(p.err, "writer exited with an error while stopping", "volume", id)
		}
	}
	if err := errors.Join(errs...); err != nil {
		return err
	}
	return errors.Join(os.RemoveAll(m.stateDir(id)), os.RemoveAll(m.socketDir(id)))
}

func (m *Manager) Mounted(path string) (bool, error) {
	_, ok, err := mountAt(m.Mountinfo, path)
	return ok, err
}

type writerSockets struct{ nbd, ninep, rpc string }

func (m *Manager) startWriter(ctx context.Context, id string) (writerSockets, error) {
	state, sock := m.stateDir(id), m.socketDir(id)
	s := writerSockets{
		nbd:   filepath.Join(sock, "nbd.sock"),
		ninep: filepath.Join(sock, "9p.sock"),
		rpc:   filepath.Join(sock, "rpc.sock"),
	}
	if p := m.writer(id); p != nil {
		return s, nil
	}
	if err := os.RemoveAll(sock); err != nil {
		return s, err
	}
	for _, dir := range []string{filepath.Join(state, cacheDir), sock} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return s, err
		}
	}
	cfg := writerConfig{
		StorageURL: m.Storage.VolumeURL(id),
		CacheDir:   filepath.Join(state, cacheDir),
		Cache:      m.Cache,
		NBDSocket:  s.nbd,
		NinePSock:  s.ninep,
		RPCSocket:  s.rpc,
		Backend:    backendSection(m.Storage.Scheme),
		Options:    m.ObjectStoreOptions,
	}
	path := filepath.Join(state, configFile)
	if err := os.WriteFile(path, []byte(cfg.render()), 0o600); err != nil {
		return s, fmt.Errorf("writing the writer config: %w", err)
	}

	// The writer outlives this call, so it can't be bound to the request's context.
	cmd := exec.Command(m.Binary, "run", "-c", path)
	cmd.Stdout, cmd.Stderr = os.Stderr, os.Stderr
	if err := cmd.Start(); err != nil {
		return s, fmt.Errorf("starting the writer: %w", err)
	}
	p := &process{cmd: cmd, done: make(chan struct{})}
	m.mu.Lock()
	if m.writers == nil {
		m.writers = map[string]*process{}
	}
	m.writers[id] = p
	m.mu.Unlock()
	go func() {
		p.err = cmd.Wait()
		m.mu.Lock()
		stopping := p.stopping
		m.mu.Unlock()
		close(p.done)
		if !stopping {
			m.Log.Error(p.err, "writer exited while serving a volume", "volume", id)
		}
	}()

	err := waitFor(ctx, p, writerStartTimeout, func() (bool, error) {
		return exists(s.nbd) && exists(s.ninep), nil
	})
	if err != nil {
		return s, fmt.Errorf("waiting for the writer: %w", err)
	}
	return s, nil
}

func (m *Manager) writer(id string) *process {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.writers[id]
}

func (m *Manager) takeWriter(id string) *process {
	m.mu.Lock()
	defer m.mu.Unlock()
	p := m.writers[id]
	if p != nil {
		p.stopping = true
		delete(m.writers, id)
	}
	return p
}

// ensureDevice creates .nbd/home at the volume's capacity, or grows it, through a short-lived 9P mount. It
// reports whether an existing device grew, which leaves ext4 to resize.
func (m *Manager) ensureDevice(ctx context.Context, v Volume, s writerSockets) (bool, error) {
	mp := filepath.Join(m.socketDir(v.ID), "fs")
	if err := os.MkdirAll(mp, 0o700); err != nil {
		return false, err
	}
	cmd := exec.Command(m.Binary, "mount", "unix:"+s.ninep, mp)
	cmd.Stdout, cmd.Stderr = os.Stderr, os.Stderr
	if err := cmd.Start(); err != nil {
		return false, fmt.Errorf("starting the device mount: %w", err)
	}
	p := &process{cmd: cmd, done: make(chan struct{}), stopping: true}
	go func() {
		p.err = cmd.Wait()
		close(p.done)
	}()
	defer func() {
		stop(p, exitGrace)
		if ok, _ := m.Mounted(mp); ok {
			_ = detach(mp)
		}
	}()
	if err := waitFor(ctx, p, mountTimeout, func() (bool, error) { return m.Mounted(mp) }); err != nil {
		return false, fmt.Errorf("waiting for the device mount: %w", err)
	}

	dir := filepath.Join(mp, ".nbd")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return false, err
	}
	path := filepath.Join(dir, deviceName)
	info, err := os.Stat(path)
	switch {
	case errors.Is(err, fs.ErrNotExist):
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
		if err != nil {
			return false, fmt.Errorf("creating the device: %w", err)
		}
		if err := errors.Join(f.Truncate(v.CapacityBytes), f.Sync(), f.Close()); err != nil {
			return false, fmt.Errorf("sizing the device: %w", err)
		}
		return false, nil
	case err != nil:
		return false, err
	case info.Size() < v.CapacityBytes:
		if err := os.Truncate(path, v.CapacityBytes); err != nil {
			return false, fmt.Errorf("growing the device: %w", err)
		}
		return true, nil
	default:
		return false, nil
	}
}

func (m *Manager) attachDevice(ctx context.Context, id, socket string) (string, error) {
	m.attach.Lock()
	defer m.attach.Unlock()
	dev, err := freeNBD(m.SysBlock)
	if err != nil {
		return "", err
	}
	args := append([]string{"-unix", socket, dev, "-name", deviceName}, m.NBDClientFlags...)
	if _, err := m.run(ctx, m.NBDClient, args...); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(m.stateDir(id), deviceFile), []byte(dev), 0o600); err != nil {
		return "", errors.Join(err, m.disconnect(ctx, dev))
	}
	if !nbdInUse(m.SysBlock, filepath.Base(dev)) {
		return "", fmt.Errorf("%s isn't connected after nbd-client returned", dev)
	}
	return dev, nil
}

func (m *Manager) detachDevice(ctx context.Context, id string) error {
	record := filepath.Join(m.stateDir(id), deviceFile)
	raw, err := os.ReadFile(record)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	dev := strings.TrimSpace(string(raw))
	if !nbdDevice.MatchString(dev) {
		return fmt.Errorf("%s names %q, not an NBD device", record, dev)
	}
	if err := m.disconnect(ctx, dev); err != nil {
		return err
	}
	return os.Remove(record)
}

func (m *Manager) disconnect(ctx context.Context, dev string) error {
	if !nbdInUse(m.SysBlock, filepath.Base(dev)) {
		return nil
	}
	_, err := m.run(ctx, m.NBDClient, "-d", dev)
	return err
}

// formatIfBlank makes ext4 on a device with no filesystem, and refuses one with another.
func (m *Manager) formatIfBlank(ctx context.Context, dev string) (bool, error) {
	out, err := m.run(ctx, m.Blkid, "-p", "-s", "TYPE", "-o", "value", dev)
	var exit *exec.ExitError
	switch {
	// blkid exits 2 when it finds nothing to identify.
	case errors.As(err, &exit) && exit.ExitCode() == 2:
	case err != nil:
		return false, err
	case strings.TrimSpace(out) == "ext4":
		return false, nil
	default:
		return false, fmt.Errorf("%s holds a %s filesystem, not ext4", dev, strings.TrimSpace(out))
	}
	// nodiscard: a new device is all holes, so discarding it would only cost a pass over the bucket.
	if _, err := m.run(ctx, m.Mkfs, "-q", "-m", "0", "-L", deviceName,
		"-E", "nodiscard,lazy_itable_init=1,lazy_journal_init=1", dev); err != nil {
		return false, err
	}
	return true, nil
}

// DetachStale clears what an earlier run of the plugin left behind: its writers died with it, so the ext4 mounts
// on their devices under root only return I/O errors, and the devices are dead.
func (m *Manager) DetachStale(ctx context.Context, root string) error {
	entries, err := readMountinfo(m.Mountinfo)
	if err != nil {
		return err
	}
	prefix := filepath.Clean(root) + string(filepath.Separator)
	var errs []error
	// Deepest first, so a publish target goes before the staging mount it binds.
	sort.Slice(entries, func(i, j int) bool { return len(entries[i].point) > len(entries[j].point) })
	for _, e := range entries {
		if !nbdDevice.MatchString(e.source) || !strings.HasPrefix(e.point, prefix) {
			continue
		}
		m.Log.Info("detaching a stale mount", "target", e.point, "device", e.source)
		if err := detach(e.point); err != nil {
			errs = append(errs, fmt.Errorf("detaching %s: %w", e.point, err))
		}
	}
	dirs, err := os.ReadDir(m.StateRoot)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return errors.Join(append(errs, err)...)
	}
	for _, d := range dirs {
		if !d.IsDir() || !validID(d.Name()) {
			continue
		}
		if err := m.detachDevice(ctx, d.Name()); err != nil {
			errs = append(errs, fmt.Errorf("disconnecting the device of %s: %w", d.Name(), err))
			continue
		}
		if err := os.RemoveAll(m.stateDir(d.Name())); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// Shutdown is for the plugin's own exit, which ends every writer: it writes back the homes' page caches, then
// stops the writers so they flush to object storage, leaving the mounts for DetachStale.
func (m *Manager) Shutdown() {
	m.mu.Lock()
	procs := make([]*process, 0, len(m.writers))
	for id, p := range m.writers {
		p.stopping = true
		procs = append(procs, p)
		delete(m.writers, id)
	}
	m.mu.Unlock()
	if len(procs) == 0 {
		return
	}
	syscall.Sync()
	var wg sync.WaitGroup
	for _, p := range procs {
		wg.Go(func() { stop(p, writerExitGrace) })
	}
	wg.Wait()
	m.Log.Info("stopped writers", "count", len(procs))
}

// Ready reports whether the nbd module is loaded.
func (m *Manager) Ready() error {
	if _, err := os.Stat(filepath.Join(m.SysBlock, "nbd0")); err != nil {
		return fmt.Errorf("no NBD devices; is the nbd module loaded? %w", err)
	}
	return nil
}

func (m *Manager) run(ctx context.Context, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	if err := cmd.Run(); err != nil {
		return stdout.String(), fmt.Errorf("%s %s: %w: %s", filepath.Base(name), strings.Join(args, " "), err,
			lastLines(stderr.String(), 5))
	}
	return stdout.String(), nil
}

// freeNBD is the lowest-numbered NBD device with no connection.
func freeNBD(sysBlock string) (string, error) {
	entries, err := os.ReadDir(sysBlock)
	if err != nil {
		return "", err
	}
	var free []int
	for _, e := range entries {
		n, err := strconv.Atoi(strings.TrimPrefix(e.Name(), "nbd"))
		if !strings.HasPrefix(e.Name(), "nbd") || err != nil || n < 0 {
			continue
		}
		if !nbdInUse(sysBlock, e.Name()) {
			free = append(free, n)
		}
	}
	if len(free) == 0 {
		return "", errors.New("every NBD device is in use; raise the nbd module's nbds_max")
	}
	sort.Ints(free)
	return "/dev/nbd" + strconv.Itoa(free[0]), nil
}

// nbdInUse reports whether a device has a connection: a pid file, or a size, which a netlink-attached device has
// without a pid.
func nbdInUse(sysBlock, name string) bool {
	if exists(filepath.Join(sysBlock, name, "pid")) {
		return true
	}
	size, err := os.ReadFile(filepath.Join(sysBlock, name, "size"))
	return err != nil || strings.TrimSpace(string(size)) != "0"
}

func (o Owner) apply(root string) error {
	if err := os.Chmod(root, o.Mode); err != nil {
		return fmt.Errorf("setting the mode of the home: %w", err)
	}
	if o.UID >= 0 || o.GID >= 0 {
		if err := os.Lchown(root, o.UID, o.GID); err != nil {
			return fmt.Errorf("setting the owner of the home: %w", err)
		}
	}
	return nil
}

// waitFor polls cond until it holds, the process exits, or the timeout passes.
func waitFor(ctx context.Context, p *process, timeout time.Duration, cond func() (bool, error)) error {
	deadline := time.After(timeout)
	tick := time.NewTicker(pollInterval)
	defer tick.Stop()
	for {
		if ok, err := cond(); err != nil {
			return err
		} else if ok {
			return nil
		}
		select {
		case <-p.done:
			return fmt.Errorf("%s exited: %v", filepath.Base(p.cmd.Path), p.err)
		case <-deadline:
			return fmt.Errorf("timed out after %s", timeout)
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
		}
	}
}

// stop ends a process politely first, so it can flush and unmount itself.
func stop(p *process, grace time.Duration) {
	_ = p.cmd.Process.Signal(syscall.SIGTERM)
	select {
	case <-p.done:
	case <-time.After(grace):
		_ = p.cmd.Process.Kill()
		<-p.done
	}
}

func isSignaled(err error) bool {
	var exit *exec.ExitError
	if !errors.As(err, &exit) {
		return false
	}
	ws, ok := exit.Sys().(syscall.WaitStatus)
	return ok && ws.Signaled()
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func lastLines(s string, n int) string {
	lines := strings.Split(strings.TrimSpace(s), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return strings.Join(lines, "\n")
}
