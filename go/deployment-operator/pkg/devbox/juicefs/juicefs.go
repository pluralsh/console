// Package juicefs is a CSI driver that serves each Substrate actor volume as a directory of one shared JuiceFS
// filesystem, so an actor's home follows it from node to node through object storage instead of a checkpoint.
//
// The filesystem is laid out as
//
//	/homes/<volume id>          one directory per volume, with a JuiceFS quota as its capacity
//	/seeds/<snapshot id>/data   a copy-on-write clone of a home, taken while its actor was suspended
//	/seeds/<snapshot id>/source the volume id the seed was cloned from
//	/claims/<seed id>           the golden volume a StorageClass's seed is captured from
//	/golden/<volume id>         the seed a golden volume becomes when it's deleted
//
// The controller mounts the whole filesystem and implements volumes and snapshots as metadata-only
// `juicefs clone` and `juicefs rmr` calls. The node plugin mounts one home per actor with --subdir, a process per
// mount so one box's cache and mount options never affect another's.
package juicefs

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"sync"
)

// DriverName is the CSI driver and StorageClass provisioner name.
const DriverName = "juicefs.devbox.plural.sh"

const (
	homesDir      = "homes"
	seedsDir      = "seeds"
	seedDataDir   = "data"
	seedSourceKey = "source"
	claimsDir     = "claims"
	goldenDir     = "golden"
	partialPrefix = ".partial-"
)

// HomePath is a volume's directory relative to the filesystem root, as `juicefs mount --subdir` takes it.
func HomePath(volumeID string) string {
	return "/" + homesDir + "/" + volumeID
}

var idPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$`)

// validID guards every id that becomes a path segment: ids come from Substrate and the gateway, and a "/" or ".."
// would escape the homes and seeds directories.
func validID(id string) bool {
	return idPattern.MatchString(id) && !strings.HasPrefix(id, partialPrefix)
}

// CLI is the subset of the juicefs command the controller uses. Paths are inside the controller's root mount,
// except SetQuota's, which is relative to the filesystem root.
type CLI interface {
	Clone(ctx context.Context, src, dst string) error
	RemoveAll(ctx context.Context, path string) error
	SetQuota(ctx context.Context, path string, bytes int64) error
}

// Exec runs the juicefs binary. META_PASSWORD or META_PASSWORD_FILE in the environment carries the metadata
// password so it never shows in a process listing.
type Exec struct {
	Binary  string
	MetaURL string
}

func (e Exec) run(ctx context.Context, args ...string) error {
	cmd := exec.CommandContext(ctx, e.Binary, args...)
	var out bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &out
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("juicefs %s: %w: %s", args[0], err, strings.TrimSpace(lastLines(out.String(), 5)))
	}
	return nil
}

func (e Exec) Clone(ctx context.Context, src, dst string) error {
	return e.run(ctx, "clone", "--preserve", src, dst)
}

func (e Exec) RemoveAll(ctx context.Context, path string) error {
	return e.run(ctx, "rmr", "--skip-trash", path)
}

func (e Exec) SetQuota(ctx context.Context, path string, bytes int64) error {
	return e.run(ctx, "quota", "set", e.MetaURL, "--path", path, "--capacity", fmt.Sprintf("%dB", bytes))
}

// Format creates the filesystem if the metadata store doesn't hold one yet and leaves an existing one untouched.
// An empty access key makes JuiceFS use the cloud's default credentials, which is how workload identity works.
func (e Exec) Format(ctx context.Context, name string, args []string) error {
	return e.run(ctx, append(append([]string{"format", "--no-update"}, args...), e.MetaURL, name)...)
}

func lastLines(s string, n int) string {
	lines := strings.Split(strings.TrimSpace(s), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return strings.Join(lines, "\n")
}

// keyedLock serializes operations on one id while letting different ids run in parallel.
type keyedLock struct {
	mu    sync.Mutex
	locks map[string]*keyedEntry
}

type keyedEntry struct {
	mu   sync.Mutex
	refs int
}

func (k *keyedLock) lock(key string) func() {
	k.mu.Lock()
	if k.locks == nil {
		k.locks = map[string]*keyedEntry{}
	}
	e := k.locks[key]
	if e == nil {
		e = &keyedEntry{}
		k.locks[key] = e
	}
	e.refs++
	k.mu.Unlock()

	e.mu.Lock()
	return func() {
		e.mu.Unlock()
		k.mu.Lock()
		if e.refs--; e.refs == 0 {
			delete(k.locks, key)
		}
		k.mu.Unlock()
	}
}
