// Package zerofs is a CSI driver that serves each Substrate actor volume as its own ZeroFS filesystem, an
// ext4 block device whose blocks live in object storage, so an actor's home follows it from node to node with no
// metadata database in the path.
//
// A volume is the bucket prefix
//
//	<storage path>/homes/<volume id>/   one ZeroFS (SlateDB) database, holding the file .nbd/home
//
// and the node plugin serves it while its actor runs there: NodeStageVolume starts a `zerofs run` writer for the
// volume, attaches its .nbd/home export to a free /dev/nbdN and mounts the ext4 on it at the staging path, and
// NodePublishVolume bind-mounts that into the actor. The writer, its cache and its NBD connection belong to one
// volume, so one box's load never stalls another's. The controller has nothing to create for an unseeded volume,
// because the first writer initializes the database; it deletes the prefix when Substrate deletes the volume.
//
// A StorageClass's seed parameter ties its volumes to a golden boot, like the JuiceFS driver's: the first volume
// claims the seed and starts empty, its database is copied to
//
//	<storage path>/seeds/<seed>/        a stopped volume's database
//
// when Substrate deletes it after the golden tag, and every later volume starts as a copy of that. Copies are
// whole databases taken with no writer attached, so each is a consistent, independent ZeroFS filesystem. What
// the controller knows about seeds is kept under <storage path>/meta/.
package zerofs

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"sync"
)

// DriverName is the CSI driver and StorageClass provisioner name.
const DriverName = "zerofs.devbox.plural.sh"

const (
	homesDir = "homes"
	seedsDir = "seeds"
	metaDir  = "meta"
	// deviceName is the NBD export, and the file under .nbd/ that backs it.
	deviceName = "home"

	schemeS3    = "s3"
	schemeGS    = "gs"
	schemeAzure = "azure"
)

var idPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$`)

// validID guards every id that becomes a path segment or object prefix: ids come from Substrate, and a "/" or
// ".." would reach another volume's objects.
func validID(id string) bool {
	return idPattern.MatchString(id)
}

// Storage is where volumes live, parsed from a ZeroFS storage URL: s3://bucket/path, gs://bucket/path or
// azure://container/path.
type Storage struct {
	Scheme string
	Bucket string
	Path   string
}

func ParseStorage(raw string) (Storage, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return Storage{}, fmt.Errorf("parsing the storage URL: %w", err)
	}
	switch u.Scheme {
	case schemeS3, schemeGS, schemeAzure:
	default:
		return Storage{}, fmt.Errorf("storage URL %q must be s3://, gs:// or azure://", raw)
	}
	if u.Host == "" || u.RawQuery != "" || u.User != nil {
		return Storage{}, fmt.Errorf("storage URL %q must be <scheme>://<bucket>/<path>", raw)
	}
	path := strings.Trim(u.Path, "/")
	for _, seg := range strings.Split(path, "/") {
		if seg == "." || seg == ".." {
			return Storage{}, fmt.Errorf("storage URL %q has a relative path", raw)
		}
	}
	return Storage{Scheme: u.Scheme, Bucket: u.Host, Path: path}, nil
}

// VolumePrefix is the object prefix that holds one volume, ending in "/".
func (s Storage) VolumePrefix(id string) string {
	return s.key(homesDir, id) + "/"
}

// SeedPrefix is the object prefix that holds one seed's database, ending in "/".
func (s Storage) SeedPrefix(seed string) string {
	return s.key(seedsDir, seed) + "/"
}

// metaKey is the object recording one fact about a seed or volume.
func (s Storage) metaKey(kind metaKind, id string) string {
	return s.key(metaDir, string(kind), id)
}

func (s Storage) key(parts ...string) string {
	if s.Path != "" {
		parts = append([]string{s.Path}, parts...)
	}
	return strings.Join(parts, "/")
}

// metaKind is a kind of controller record under <storage path>/meta/.
type metaKind string

const (
	// metaClaim, keyed by seed, names the volume the seed is captured from. It outlives the capture so that no
	// later volume, which would be a user's home, ever becomes the seed.
	metaClaim metaKind = "claims"
	// metaGolden, keyed by volume, names the seed a volume becomes when it's deleted.
	metaGolden metaKind = "golden"
	// metaCaptured, keyed by seed, marks a seed whose database copy is complete.
	metaCaptured metaKind = "captured"
	// metaCloned, keyed by volume, marks a volume whose copy of its seed is complete.
	metaCloned metaKind = "cloned"
)

// VolumeURL is the ZeroFS storage URL of one volume.
func (s Storage) VolumeURL(id string) string {
	return s.Scheme + "://" + s.Bucket + "/" + strings.TrimSuffix(s.VolumePrefix(id), "/")
}

// BucketURL is the gocloud.dev/blob URL of the bucket. Credentials and endpoints come from the same environment
// ZeroFS reads; pathStyle addresses an S3-compatible endpoint, such as RustFS, by path.
func (s Storage) BucketURL(pathStyle bool) string {
	switch s.Scheme {
	case schemeGS:
		return "gs://" + s.Bucket
	case schemeAzure:
		return "azblob://" + s.Bucket
	}
	if pathStyle {
		return "s3://" + s.Bucket + "?use_path_style=true"
	}
	return "s3://" + s.Bucket
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
