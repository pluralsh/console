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
	"sync/atomic"
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
	// stoppedFile marks a volume whose writer flushed and exited cleanly when the plugin shut down.
	stoppedFile = "stopped"
	// writerOOMScoreAdj has the kernel kill nearly anything else on the node before a writer: a killed writer
	// loses the writes it acknowledged but hadn't flushed, which the box's page cache believes are on disk.
	writerOOMScoreAdj = -900
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
	// StateRoot holds each volume's config and attached device, and the caches, on the node's disk.
	StateRoot string
	// SocketDir holds each writer's sockets and the device-creation mount. It must not propagate to the host,
	// and its paths must fit a Unix socket address.
	SocketDir string
	Cache     CacheConfig
	// ParkedCacheBytes bounds the disk the caches of volumes no longer staged here may hold, so a home staged
	// here again starts with what it read last time. The least recently unstaged go first; 0 keeps none.
	ParkedCacheBytes int64
	// MountOptions are the ext4 mount's data options. Unstage trims free blocks, so discard isn't needed.
	MountOptions string
	Mountinfo    string
	SysBlock     string
	Log          logr.Logger

	mu      sync.Mutex
	writers map[string]*process
	// attach serializes choosing a free NBD device and connecting it.
	attach sync.Mutex
	// writerExits counts writers that exited without being stopped.
	writerExits atomic.Int64
	// caches serializes evicting parked caches with a stage claiming its cache.
	caches sync.Mutex
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
	mounted, err := m.Mounted(staging)
	if err != nil {
		return err
	}
	p := m.writer(v.ID)
	switch {
	case mounted && p != nil && !p.exited():
		return nil
	case mounted:
		// Writes to the home have been failing since its writer died; serving it again would hide that.
		return fmt.Errorf("the writer of volume %s has exited, so its home has lost writes; unstage it to recover", v.ID)
	case exists(m.stateDir(v.ID)):
		// What a failed stage or unstage left behind: finish tearing it down first.
		if err := m.Unstage(ctx, v.ID, staging); err != nil {
			return fmt.Errorf("cleaning up an earlier stage: %w", err)
		}
	}

	defer func() {
		if err != nil {
			if cerr := m.Unstage(context.WithoutCancel(ctx), v.ID, staging); cerr != nil {
				m.Log.Error(cerr, "cleaning up a failed stage", "volume", v.ID)
			}
		}
	}()
	sockets, err := m.startWriter(ctx, v.ID, v.CapacityBytes)
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
	if err := removeEmptyLostFound(staging); err != nil {
		m.Log.Error(err, "removing lost+found from the home", "volume", v.ID)
	}
	m.Log.Info("serving volume", "volume", v.ID, "device", dev, "formatted", formatted, "grown", grown,
		"cacheDiskGB", m.Cache.diskGB(v.CapacityBytes))
	return nil
}

// Unstage stops serving a volume so another node can open it, in the reverse order of Stage: unmount, which
// writes back the page cache to the device; flush the writer to object storage; disconnect the device; stop the
// writer. Every step must succeed before the next, and the volume's state is only removed once the writer has
// exited cleanly, so a failed Unstage leaves everything in place for a retry. The home's free blocks are trimmed
// first, in one pass rather than on every delete as the discard mount option would.
func (m *Manager) Unstage(ctx context.Context, id, staging string) error {
	if ok, err := m.Mounted(staging); err != nil {
		return err
	} else if ok {
		if p := m.writer(id); p != nil && !p.exited() {
			start := time.Now()
			if err := trim(staging); err != nil {
				m.Log.Error(err, "trimming the home's free blocks", "volume", id)
			} else {
				m.Log.Info("trimmed the home's free blocks", "volume", id, "took", time.Since(start))
			}
		}
		if err := unmount(staging); err != nil {
			return fmt.Errorf("unmounting %s: %w", staging, err)
		}
	}
	dev, err := m.device(id)
	if err != nil {
		return err
	}
	if dev != "" {
		if busy, err := deviceBusy(dev); err != nil {
			return err
		} else if busy {
			return fmt.Errorf("%s is still in use by a mount outside %s", dev, staging)
		}
	}

	return m.closeVolume(ctx, id)
}

// closeVolume flushes a volume's writer, disconnects its device and stops the writer, restarting a writer that
// died first. It removes the volume's state only once all of that succeeded.
func (m *Manager) closeVolume(ctx context.Context, id string) error {
	p := m.writer(id)
	if p == nil || p.exited() {
		if err := m.detachDevice(ctx, id); err != nil {
			return err
		}
		if !exists(m.stateDir(id)) {
			return os.RemoveAll(m.socketDir(id))
		}
		if exists(filepath.Join(m.stateDir(id), stoppedFile)) {
			return errors.Join(m.removeState(id), os.RemoveAll(m.socketDir(id)))
		}
		// The writer died, or an earlier stop failed: reopen the database and close it cleanly. Whatever the dead
		// writer hadn't flushed is lost, but the next node opens what it did.
		m.Log.Error(nil, "recovering a volume whose writer didn't stop cleanly; writes since its last flush may be lost", "volume", id)
		if p != nil {
			m.forgetWriter(id, p)
		}
		if _, err := m.startWriter(ctx, id, 0); err != nil {
			return fmt.Errorf("restarting the writer to recover: %w", err)
		}
		p = m.writer(id)
	}
	if err := m.flush(ctx, id); err != nil {
		return err
	}
	if err := m.detachDevice(ctx, id); err != nil {
		return err
	}
	if err := m.stopWriter(id, p); err != nil {
		return err
	}
	return errors.Join(m.removeState(id), os.RemoveAll(m.socketDir(id)))
}

// flush makes the writer persist everything it acknowledged to object storage.
func (m *Manager) flush(ctx context.Context, id string) error {
	ctx, cancel := context.WithTimeout(ctx, writerExitGrace)
	defer cancel()
	if _, err := m.run(ctx, m.Binary, "flush", "-c", filepath.Join(m.stateDir(id), configFile)); err != nil {
		return fmt.Errorf("flushing volume %s: %w", id, err)
	}
	return nil
}

// stopWriter ends a writer and reports whether it exited cleanly. A writer that fails or has to be killed leaves
// its volume's state behind, which the next Stage, Unstage or plugin start recovers.
func (m *Manager) stopWriter(id string, p *process) error {
	m.mu.Lock()
	p.stopping = true
	m.mu.Unlock()
	killed := stop(p, writerExitGrace)
	m.forgetWriter(id, p)
	switch {
	case killed:
		return fmt.Errorf("the writer of volume %s didn't exit within %s and was killed", id, writerExitGrace)
	case p.err != nil:
		return fmt.Errorf("the writer of volume %s exited uncleanly: %w", id, p.err)
	}
	return nil
}

func (m *Manager) Mounted(path string) (bool, error) {
	_, ok, err := mountAt(m.Mountinfo, path)
	return ok, err
}

type writerSockets struct{ nbd, ninep, rpc string }

// startWriter starts a volume's writer with its cache sized for capacity. A capacity of 0 reuses the config the
// volume was last staged with, falling back to the smallest cache.
func (m *Manager) startWriter(ctx context.Context, id string, capacity int64) (writerSockets, error) {
	state, sock := m.stateDir(id), m.socketDir(id)
	s := writerSockets{
		nbd:   filepath.Join(sock, "nbd.sock"),
		ninep: filepath.Join(sock, "9p.sock"),
		rpc:   filepath.Join(sock, "rpc.sock"),
	}
	if p := m.writer(id); p != nil && !p.exited() {
		return s, nil
	} else if p != nil {
		m.forgetWriter(id, p)
	}
	if err := os.RemoveAll(sock); err != nil {
		return s, err
	}
	if err := m.claimCache(id); err != nil {
		return s, err
	}
	if err := os.MkdirAll(sock, 0o700); err != nil {
		return s, err
	}
	if err := os.Remove(filepath.Join(state, stoppedFile)); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return s, err
	}
	cfg := writerConfig{
		StorageURL: m.Storage.VolumeURL(id),
		CacheDir:   m.cacheDir(id),
		DiskGB:     m.Cache.diskGB(capacity),
		MemoryGB:   m.Cache.MemoryGB,
		NBDSocket:  s.nbd,
		NinePSock:  s.ninep,
		RPCSocket:  s.rpc,
		Backend:    backendSection(m.Storage.Scheme),
		Options:    m.ObjectStoreOptions,
	}
	path := filepath.Join(state, configFile)
	if capacity > 0 || !exists(path) {
		if err := os.WriteFile(path, []byte(cfg.render()), 0o600); err != nil {
			return s, fmt.Errorf("writing the writer config: %w", err)
		}
	}

	// The writer outlives this call, so it can't be bound to the request's context.
	cmd := exec.Command(m.Binary, "run", "-c", path)
	cmd.Stdout, cmd.Stderr = os.Stderr, os.Stderr
	if err := cmd.Start(); err != nil {
		return s, fmt.Errorf("starting the writer: %w", err)
	}
	if err := setOOMScoreAdj(cmd.Process.Pid, writerOOMScoreAdj); err != nil {
		m.Log.Info("couldn't lower the writer's OOM priority", "volume", id, "error", err.Error())
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
			m.writerExits.Add(1)
			m.Log.Error(p.err, "writer exited while serving a volume; the box sees I/O errors until it's suspended", "volume", id)
		}
	}()

	err := waitFor(ctx, p, writerStartTimeout, func() (bool, error) {
		return exists(s.nbd) && exists(s.ninep) && exists(s.rpc), nil
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

func (m *Manager) forgetWriter(id string, p *process) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.writers[id] == p {
		delete(m.writers, id)
	}
}

func (p *process) exited() bool {
	select {
	case <-p.done:
		return true
	default:
		return false
	}
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
	dev, err := freeNBD(m.SysBlock, func(dev string) bool {
		busy, err := deviceBusy(dev)
		return busy || err != nil
	})
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

// device is the NBD device recorded for a volume, or "" if it has none.
func (m *Manager) device(id string) (string, error) {
	record := filepath.Join(m.stateDir(id), deviceFile)
	raw, err := os.ReadFile(record)
	if errors.Is(err, fs.ErrNotExist) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	dev := strings.TrimSpace(string(raw))
	if !nbdDevice.MatchString(dev) {
		return "", fmt.Errorf("%s names %q, not an NBD device", record, dev)
	}
	return dev, nil
}

func (m *Manager) detachDevice(ctx context.Context, id string) error {
	dev, err := m.device(id)
	if err != nil || dev == "" {
		return err
	}
	if err := m.disconnect(ctx, dev); err != nil {
		return err
	}
	return os.Remove(filepath.Join(m.stateDir(id), deviceFile))
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
// on their devices under root only return I/O errors, and the devices are dead. A volume whose writer didn't
// flush and exit cleanly is recovered; one that fails to recover keeps its state for the next Stage or Unstage.
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
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, d := range dirs {
		if !d.IsDir() || !validID(d.Name()) {
			continue
		}
		wg.Go(func() {
			if err := m.closeVolume(ctx, d.Name()); err != nil {
				mu.Lock()
				errs = append(errs, fmt.Errorf("closing volume %s: %w", d.Name(), err))
				mu.Unlock()
			}
		})
	}
	wg.Wait()
	m.evictCaches()
	return errors.Join(errs...)
}

// Shutdown is for the plugin's own exit, which ends every writer: it writes back the homes' page caches, then
// flushes and stops the writers, leaving the mounts for DetachStale. A writer that does both cleanly marks its
// volume stopped, so the next run needn't recover it.
func (m *Manager) Shutdown() {
	m.mu.Lock()
	procs := make(map[string]*process, len(m.writers))
	for id, p := range m.writers {
		procs[id] = p
	}
	m.mu.Unlock()
	if len(procs) == 0 {
		return
	}
	syscall.Sync()
	var wg sync.WaitGroup
	for id, p := range procs {
		wg.Go(func() {
			err := m.flush(context.Background(), id)
			if serr := m.stopWriter(id, p); err == nil {
				err = serr
			}
			if err == nil {
				err = os.WriteFile(filepath.Join(m.stateDir(id), stoppedFile), nil, 0o600)
			}
			if err != nil {
				m.Log.Error(err, "stopping a writer uncleanly; the next run recovers its volume", "volume", id)
			}
		})
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

// freeNBD is the lowest-numbered NBD device with no connection that isn't held: a lazily detached filesystem can
// outlive its device's connection, and would write into whatever volume the device was attached to next.
func freeNBD(sysBlock string, held func(dev string) bool) (string, error) {
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
		if !nbdInUse(sysBlock, e.Name()) && !held("/dev/"+e.Name()) {
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

// removeEmptyLostFound removes the root-only lost+found mkfs.ext4 leaves at the root of the filesystem, which is
// the home itself. ext4 doesn't need it; e2fsck recreates it if it has orphans to place, and then it isn't empty
// and stays. Anything else by that name is the user's and is left alone.
func removeEmptyLostFound(root string) error {
	path := filepath.Join(root, "lost+found")
	if fi, err := os.Lstat(path); err != nil || !fi.IsDir() {
		if err == nil || errors.Is(err, fs.ErrNotExist) {
			return nil
		}
		return err
	}
	err := os.Remove(path)
	if err == nil || errors.Is(err, fs.ErrNotExist) || errors.Is(err, syscall.ENOTEMPTY) || errors.Is(err, syscall.EEXIST) {
		return nil
	}
	return err
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
			return fmt.Errorf("%s exited: %w", filepath.Base(p.cmd.Path), p.err)
		case <-deadline:
			return fmt.Errorf("timed out after %s", timeout)
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
		}
	}
}

// stop ends a process politely first, so it can flush and unmount itself, and reports whether it had to be killed.
func stop(p *process, grace time.Duration) bool {
	_ = p.cmd.Process.Signal(syscall.SIGTERM)
	select {
	case <-p.done:
		return false
	case <-time.After(grace):
		_ = p.cmd.Process.Kill()
		<-p.done
		return true
	}
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
