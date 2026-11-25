package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

const (
	// readyMarker holds the install ID of the runtime the devbox container may exec.
	readyMarker = "ready"
	// componentsDir holds the installed components, shared by the installs that use them.
	componentsDir = "components"
	tmpSuffix     = ".tmp"
)

// result describes what install did, for the log line.
type result struct {
	// Action is "installed" or "kept".
	Action string
	// ID is the install ID (runtimemanifest.InstallID) the marker names.
	ID  string
	Dir string
	// Components are the installed components; Copied the ones this run copied.
	Components []string
	Copied     []string
	// Missing are the requested agents the runtime doesn't carry.
	Missing []string
	Bytes   int64
	Removed []string
}

// install installs the components the agents (and the browser) need from the payload in src into
// <dst>/components, makes <dst>/<install dir> hold their manifest and commands, and makes <dst>/ready name the
// install ID (the digest and the agent selection):
//
//	<dst>/ready                         the install ID the devbox container may exec
//	<dst>/components/<name>-<hash>/     a component, named after its content
//	<dst>/<install dir>/manifest.json   the installed components and agents (runtimemanifest.Installed)
//	<dst>/<install dir>/bin/            their commands: devbox-daemon, claude, codex-acp, ...
//
// Components are named after their content, so a runtime update copies only the components that changed. An
// installed runtime is immutable: what already matches is left alone, because the devbox container starts first
// and may already be running it under a marker that is still valid. Anything else is replaced, and the marker is
// withdrawn first so the devbox container can't exec a runtime that is missing or half written. Components and
// installs the ID doesn't use are pruned afterwards.
//
// The daemon is compared by content. The agent components (up to a gigabyte) are compared by their files' sizes
// and modes, since hashing them on every start would delay it by seconds; the home is the sandbox user's, who
// can change them in place anyway.
//
// The home is the sandbox user's too, and they can swap any directory in it for a link while this runs, as root.
// Every change in the home therefore goes through an os.Root opened on dst's parent, which never resolves a path
// outside it; links planted before the run are replaced rather than followed.
func install(src, dst, digest string, agents []string, browser bool) (result, error) {
	if digest == "" || strings.ContainsAny(digest, "/\\ \t\n+") || strings.HasPrefix(digest, ".") {
		return result{}, fmt.Errorf("invalid runtime digest %q", digest)
	}
	id := runtimemanifest.InstallID(digest, agents, browser)
	name := runtimemanifest.InstallDirName(id)
	res := result{Action: "kept", ID: id, Dir: filepath.Join(dst, name)}

	m, err := runtimemanifest.Load(filepath.Join(src, runtimemanifest.FileName))
	if err != nil {
		return res, fmt.Errorf("reading the runtime manifest: %w", err)
	}
	res.Components, res.Missing = m.Select(agents, browser)

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return res, err
	}
	home, err := os.OpenRoot(filepath.Dir(dst))
	if err != nil {
		return res, fmt.Errorf("opening the home: %w", err)
	}
	defer home.Close()
	base := filepath.Base(dst)
	at := func(elem ...string) string { return filepath.Join(append([]string{base}, elem...)...) }
	final, marker, compRoot := at(name), at(readyMarker), at(componentsDir)

	for _, dir := range []string{base, compRoot} {
		if err := ensureDir(home, dir); err != nil {
			return res, err
		}
	}

	withdrawn := false
	withdraw := func() error {
		if withdrawn {
			return nil
		}
		withdrawn = true
		if err := home.Remove(marker); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return fmt.Errorf("withdrawing the ready marker: %w", err)
		}
		return nil
	}

	dirs := map[string]string{}
	for _, c := range res.Components {
		dirs[c] = runtimemanifest.DirName(c, m.Components[c])
		from, to := filepath.Join(src, componentsDir, c), filepath.Join(compRoot, dirs[c])
		same, err := treesMatch(home, from, to, c == runtimemanifest.Daemon)
		if err != nil {
			return res, fmt.Errorf("reading the %s component: %w", c, err)
		}
		if same {
			continue
		}
		if err := withdraw(); err != nil {
			return res, err
		}
		n, err := replaceDir(home, to, func(tmp string) (int64, error) { return copyTree(home, from, tmp) })
		res.Bytes += n
		if err != nil {
			return res, fmt.Errorf("installing the %s component: %w", c, err)
		}
		res.Copied = append(res.Copied, c)
	}

	want, err := runtimeFiles(m, res.Components, dirs)
	if err != nil {
		return res, err
	}
	same := runtimeMatches(home, final, want)
	if !same {
		if err := withdraw(); err != nil {
			return res, err
		}
		if _, err := replaceDir(home, final, func(tmp string) (int64, error) { return 0, writeRuntime(home, tmp, want) }); err != nil {
			return res, fmt.Errorf("publishing the runtime: %w", err)
		}
	}
	if len(res.Copied) > 0 || !same {
		res.Action = "installed"
	}

	res.Removed = append(res.Removed, prune(home, base, name, readyMarker, componentsDir)...)
	keep := make([]string, 0, len(dirs))
	for _, d := range dirs {
		keep = append(keep, d)
	}
	for _, r := range prune(home, compRoot, keep...) {
		res.Removed = append(res.Removed, filepath.Join(componentsDir, r))
	}

	if cur, _ := home.ReadFile(marker); strings.TrimSpace(string(cur)) != id {
		// Renamed into place, so the devbox container never reads a partial marker.
		tmp := marker + tmpSuffix
		if err := home.RemoveAll(tmp); err != nil {
			return res, fmt.Errorf("clearing %s: %w", tmp, err)
		}
		if err := writeFile(home, tmp, []byte(id+"\n"), 0o644); err != nil {
			return res, fmt.Errorf("writing the ready marker: %w", err)
		}
		if err := home.Rename(tmp, marker); err != nil {
			return res, fmt.Errorf("publishing the ready marker: %w", err)
		}
	}
	return res, nil
}

// ensureDir makes name a directory, replacing anything else there (a file or a link).
func ensureDir(home *os.Root, name string) error {
	if info, err := home.Lstat(name); err == nil && !info.IsDir() {
		if err := home.Remove(name); err != nil {
			return fmt.Errorf("removing %s, which is not a directory: %w", name, err)
		}
	}
	if err := home.Mkdir(name, 0o755); err != nil && !errors.Is(err, fs.ErrExist) {
		return fmt.Errorf("creating %s: %w", name, err)
	}
	return nil
}

// replaceDir fills <name>.tmp with fill and renames it over name.
func replaceDir(home *os.Root, name string, fill func(tmp string) (int64, error)) (int64, error) {
	tmp := name + tmpSuffix
	if err := home.RemoveAll(tmp); err != nil {
		return 0, fmt.Errorf("clearing %s: %w", tmp, err)
	}
	if err := home.Mkdir(tmp, 0o755); err != nil {
		return 0, err
	}
	n, err := fill(tmp)
	if err != nil {
		return n, err
	}
	if err := home.RemoveAll(name); err != nil {
		return n, fmt.Errorf("removing the mismatching %s: %w", name, err)
	}
	return n, home.Rename(tmp, name)
}

// prune removes everything in dir but keep, and returns what it removed.
func prune(home *os.Root, dir string, keep ...string) []string {
	entries, err := fs.ReadDir(home.FS(), filepath.ToSlash(dir))
	if err != nil {
		return nil
	}
	var removed []string
	for _, e := range entries {
		if slices.Contains(keep, e.Name()) {
			continue
		}
		if err := home.RemoveAll(filepath.Join(dir, e.Name())); err == nil {
			removed = append(removed, e.Name())
		}
	}
	return removed
}

// runtimeFile is one file of an installed runtime's directory: a regular file (manifest.json, a script launcher)
// or, with Link set, a symlink to a component's executable.
type runtimeFile struct {
	Data []byte
	Link string
}

// runtimeFiles is what an installed runtime's directory holds, keyed by path relative to it.
func runtimeFiles(m *runtimemanifest.Manifest, components []string, dirs map[string]string) (map[string]runtimeFile, error) {
	fromRuntime := func(c string) string { return path.Join("..", componentsDir, dirs[c]) }
	installed := m.Installed(components, fromRuntime)
	data, err := json.MarshalIndent(installed, "", "  ")
	if err != nil {
		return nil, err
	}
	files := map[string]runtimeFile{runtimemanifest.FileName: {Data: append(data, '\n')}}
	for _, c := range components {
		comp := m.Components[c]
		if comp.Private {
			continue
		}
		for bin, b := range comp.Bin {
			// From the bin directory, one level further down than the runtime's.
			target := path.Join("..", fromRuntime(c), b.Path)
			name := path.Join(runtimemanifest.BinDir, bin)
			if b.Interpreter == "" {
				files[name] = runtimeFile{Link: target}
				continue
			}
			ic, ib, _ := m.Interpreter(comp, b)
			files[name] = runtimeFile{Data: launcher(path.Join("..", fromRuntime(ic), ib.Path), target)}
		}
	}
	return files, nil
}

// launcher is a script command: POSIX sh, which every environment image has, that runs the script with the
// runtime's interpreter by paths relative to its own, so it works wherever the home is mounted (but not through
// a link to it elsewhere). Manifest validation keeps the paths free of characters sh would interpret.
func launcher(interpreter, script string) []byte {
	return fmt.Appendf(nil, `#!/bin/sh
case $0 in */*) d=${0%%/*} ;; *) d=. ;; esac
exec "$d/%s" "$d/%s" "$@"
`, interpreter, script)
}

// runtimeMatches reports whether dir holds exactly the files want describes.
func runtimeMatches(home *os.Root, dir string, want map[string]runtimeFile) bool {
	// Only the last element of a path is not followed: dir itself must not be a link (to elsewhere in the home).
	if info, err := home.Lstat(dir); err != nil || !info.IsDir() {
		return false
	}
	found := 0
	err := fs.WalkDir(home.FS(), filepath.ToSlash(dir), func(_ string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() {
			found++
		}
		return err
	})
	if err != nil || found != len(want) {
		return false
	}
	if info, err := home.Lstat(filepath.Join(dir, runtimemanifest.BinDir)); err == nil && !info.IsDir() {
		return false
	}
	for rel, f := range want {
		name := filepath.Join(dir, rel)
		info, err := home.Lstat(name)
		if err != nil {
			return false
		}
		if f.Link != "" {
			if target, err := home.Readlink(name); err != nil || target != f.Link {
				return false
			}
			continue
		}
		if !info.Mode().IsRegular() || info.Mode().Perm() != runtimeFileMode(rel) {
			return false
		}
		if data, err := home.ReadFile(name); err != nil || !bytes.Equal(data, f.Data) {
			return false
		}
	}
	return true
}

func writeRuntime(home *os.Root, dir string, files map[string]runtimeFile) error {
	if err := home.Mkdir(filepath.Join(dir, runtimemanifest.BinDir), 0o755); err != nil {
		return err
	}
	for rel, f := range files {
		name := filepath.Join(dir, rel)
		if f.Link != "" {
			if err := home.Symlink(f.Link, name); err != nil {
				return err
			}
			continue
		}
		if err := writeFile(home, name, f.Data, runtimeFileMode(rel)); err != nil {
			return err
		}
	}
	return nil
}

func runtimeFileMode(rel string) os.FileMode {
	if path.Dir(rel) == runtimemanifest.BinDir {
		return 0o755
	}
	return 0o644
}

// writeFile creates name, which must not exist.
func writeFile(home *os.Root, name string, data []byte, mode os.FileMode) error {
	_, err := create(home, name, mode, bytes.NewReader(data))
	return err
}

// create creates name, which must not exist, with r's content and mode. The mode is set through the open file
// (the umask may have narrowed it, and the dev user must be able to read and run the runtime), never by path.
func create(home *os.Root, name string, mode os.FileMode, r io.Reader) (int64, error) {
	f, err := home.OpenFile(name, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
	if err != nil {
		return 0, err
	}
	n, err := io.Copy(f, r)
	if err == nil {
		err = f.Chmod(mode)
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	return n, err
}

// copyWorkers is how many files copyTree creates at once. Creating a file under gVisor costs far more than writing
// it, so trees of many small files (pi's node_modules) copy several times faster in parallel.
const copyWorkers = 16

// copyTree copies the regular files and directories under src into dst, which exists and is empty, keeping
// only the executable bit. Directories are created first, in walk order, then the files in parallel.
func copyTree(home *os.Root, src, dst string) (int64, error) {
	type file struct {
		from, to string
		mode     os.FileMode
	}
	var files []file
	err := filepath.WalkDir(src, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return home.Mkdir(target, 0o755)
		}
		if !d.Type().IsRegular() {
			return fmt.Errorf("%s is not a regular file", p)
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		files = append(files, file{from: p, to: target, mode: fileMode(info)})
		return nil
	})
	if err != nil {
		return 0, err
	}

	var (
		total   atomic.Int64
		next    atomic.Int64
		errOnce sync.Once
		first   error
		wg      sync.WaitGroup
	)
	for range min(copyWorkers, len(files)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				i := int(next.Add(1)) - 1
				if i >= len(files) {
					return
				}
				f := files[i]
				n, err := copyFile(home, f.from, f.to, f.mode)
				total.Add(n)
				if err != nil {
					errOnce.Do(func() { first = err })
					next.Store(int64(len(files)))
					return
				}
			}
		}()
	}
	wg.Wait()
	return total.Load(), first
}

func copyFile(home *os.Root, from, to string, mode os.FileMode) (int64, error) {
	in, err := os.Open(from)
	if err != nil {
		return 0, err
	}
	defer in.Close()
	return create(home, to, mode, in)
}

func fileMode(info fs.FileInfo) os.FileMode {
	if info.Mode()&0o111 != 0 {
		return 0o755
	}
	return 0o644
}

// treesMatch reports whether every directory and file under src (in this image) is under dst (in the home): as
// a directory, not a link, so later paths can't resolve elsewhere, or as a regular file with the same size and
// mode and, with content, the same content. A missing or unreadable dst entry is a mismatch, not an error.
func treesMatch(home *os.Root, src, dst string, content bool) (bool, error) {
	equal := true
	err := filepath.WalkDir(src, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !equal {
			return filepath.SkipAll
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		tinfo, terr := home.Lstat(target)
		if d.IsDir() {
			equal = terr == nil && tinfo.IsDir()
			return nil
		}
		if !d.Type().IsRegular() {
			return fmt.Errorf("%s is not a regular file", p)
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		if terr != nil || !tinfo.Mode().IsRegular() || tinfo.Mode().Perm() != fileMode(info) || tinfo.Size() != info.Size() {
			equal = false
			return nil
		}
		if content {
			want, err := fileSum(os.Open(p))
			if err != nil {
				return err
			}
			got, err := fileSum(home.Open(target))
			equal = err == nil && bytes.Equal(want, got)
		}
		return nil
	})
	return equal, err
}

func fileSum(f *os.File, err error) ([]byte, error) {
	if err != nil {
		return nil, err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return nil, err
	}
	return h.Sum(nil), nil
}
