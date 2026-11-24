package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	digestA = "sha256:aaaa"
	digestB = "sha256:bbbb"
)

func payload(t *testing.T, daemon string) string {
	t.Helper()
	src := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(src, "bin"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(src, "bin", "devbox-daemon"), []byte(daemon), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(src, "runtime.json"), []byte(`{}`), 0o644))
	return src
}

func read(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	return string(data)
}

func TestInstallFresh(t *testing.T) {
	src, dst := payload(t, "daemon-a"), filepath.Join(t.TempDir(), ".plural-runtime")

	res, err := install(src, dst, digestA)
	require.NoError(t, err)
	assert.Equal(t, "installed", res.Action)
	assert.Equal(t, filepath.Join(dst, "sha256-aaaa"), res.Dir)
	assert.Equal(t, int64(len("daemon-a")+len(`{}`)), res.Bytes)

	bin := filepath.Join(dst, "sha256-aaaa", "bin", "devbox-daemon")
	assert.Equal(t, "daemon-a", read(t, bin))
	info, err := os.Stat(bin)
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o755), info.Mode().Perm())
	info, err = os.Stat(filepath.Join(dst, "sha256-aaaa", "runtime.json"))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o644), info.Mode().Perm())
	assert.Equal(t, digestA+"\n", read(t, filepath.Join(dst, readyMarker)))
}

// A matching install must not be touched: the devbox container may be executing it.
func TestInstallKeepsMatchingRuntime(t *testing.T) {
	src, dst := payload(t, "daemon-a"), t.TempDir()
	_, err := install(src, dst, digestA)
	require.NoError(t, err)
	bin := filepath.Join(dst, "sha256-aaaa", "bin", "devbox-daemon")
	before, err := os.Stat(bin)
	require.NoError(t, err)
	marker, err := os.Stat(filepath.Join(dst, readyMarker))
	require.NoError(t, err)

	res, err := install(src, dst, digestA)
	require.NoError(t, err)
	assert.Equal(t, "kept", res.Action)
	assert.Zero(t, res.Bytes)

	after, err := os.Stat(bin)
	require.NoError(t, err)
	assert.True(t, os.SameFile(before, after), "the installed binary was replaced")
	markerAfter, err := os.Stat(filepath.Join(dst, readyMarker))
	require.NoError(t, err)
	assert.True(t, os.SameFile(marker, markerAfter), "the marker was rewritten")
}

func TestInstallReplacesTamperedRuntime(t *testing.T) {
	src, dst := payload(t, "daemon-a"), t.TempDir()
	_, err := install(src, dst, digestA)
	require.NoError(t, err)
	bin := filepath.Join(dst, "sha256-aaaa", "bin", "devbox-daemon")

	for name, tamper := range map[string]func(){
		"content": func() { require.NoError(t, os.WriteFile(bin, []byte("evil"), 0o755)) },
		"mode":    func() { require.NoError(t, os.Chmod(bin, 0o644)) },
		"missing": func() { require.NoError(t, os.Remove(bin)) },
		"symlink": func() {
			require.NoError(t, os.Remove(bin))
			other := filepath.Join(t.TempDir(), "other")
			require.NoError(t, os.WriteFile(other, []byte("daemon-a"), 0o755))
			require.NoError(t, os.Symlink(other, bin))
		},
	} {
		t.Run(name, func(t *testing.T) {
			tamper()
			res, err := install(src, dst, digestA)
			require.NoError(t, err)
			assert.Equal(t, "installed", res.Action)
			assert.Equal(t, "daemon-a", read(t, bin))
			info, err := os.Lstat(bin)
			require.NoError(t, err)
			assert.Equal(t, os.FileMode(0o755), info.Mode())
			assert.Equal(t, digestA+"\n", read(t, filepath.Join(dst, readyMarker)))
		})
	}
}

func TestInstallNewVersionPrunesOld(t *testing.T) {
	dst := t.TempDir()
	_, err := install(payload(t, "daemon-a"), dst, digestA)
	require.NoError(t, err)
	require.NoError(t, os.MkdirAll(filepath.Join(dst, "sha256-cccc.tmp"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dst, "ready.tmp"), []byte("x"), 0o644))

	res, err := install(payload(t, "daemon-b"), dst, digestB)
	require.NoError(t, err)
	assert.Equal(t, "installed", res.Action)
	assert.ElementsMatch(t, []string{"sha256-aaaa", "sha256-cccc.tmp", "ready.tmp"}, res.Removed)

	entries, err := os.ReadDir(dst)
	require.NoError(t, err)
	var names []string
	for _, e := range entries {
		names = append(names, e.Name())
	}
	assert.ElementsMatch(t, []string{"sha256-bbbb", readyMarker}, names)
	assert.Equal(t, "daemon-b", read(t, filepath.Join(dst, "sha256-bbbb", "bin", "devbox-daemon")))
	assert.Equal(t, digestB+"\n", read(t, filepath.Join(dst, readyMarker)))
}

// A failed install never leaves a marker naming the runtime that wasn't installed, wherever it fails.
func TestInstallFailureNeverPublishesTheNewRuntime(t *testing.T) {
	// "aaa" sorts before the daemon (fails while comparing), "zzz" after it (fails while copying).
	for _, name := range []string{"aaa-link", "zzz-link"} {
		t.Run(name, func(t *testing.T) {
			dst := t.TempDir()
			_, err := install(payload(t, "daemon-a"), dst, digestA)
			require.NoError(t, err)

			src := payload(t, "daemon-b")
			require.NoError(t, os.Symlink("/nonexistent", filepath.Join(src, "bin", name)))
			_, err = install(src, dst, digestB)
			require.Error(t, err)
			marker, _ := os.ReadFile(filepath.Join(dst, readyMarker))
			assert.NotContains(t, string(marker), digestB)
			assert.NoDirExists(t, filepath.Join(dst, "sha256-bbbb"))
		})
	}
}

// The install root is on the sandbox user's volume: a link planted there is replaced, not followed.
func TestInstallDoesNotFollowALinkedRoot(t *testing.T) {
	home, elsewhere := t.TempDir(), t.TempDir()
	keep := filepath.Join(elsewhere, "keep")
	require.NoError(t, os.WriteFile(keep, []byte("x"), 0o644))
	dst := filepath.Join(home, ".plural-runtime")
	require.NoError(t, os.Symlink(elsewhere, dst))

	_, err := install(payload(t, "daemon-a"), dst, digestA)
	require.NoError(t, err)
	info, err := os.Lstat(dst)
	require.NoError(t, err)
	assert.True(t, info.IsDir(), "the link was not replaced by a directory")
	assert.FileExists(t, keep, "the link's target was pruned")
	assert.NoFileExists(t, filepath.Join(elsewhere, readyMarker))
	assert.Equal(t, digestA+"\n", read(t, filepath.Join(dst, readyMarker)))

	// The same for the marker's temp file.
	require.NoError(t, os.Remove(filepath.Join(dst, readyMarker)))
	require.NoError(t, os.Symlink(keep, filepath.Join(dst, readyMarker+tmpSuffix)))
	_, err = install(payload(t, "daemon-a"), dst, digestA)
	require.NoError(t, err)
	assert.Equal(t, "x", read(t, keep))
}

func TestInstallRejectsBadDigest(t *testing.T) {
	for _, digest := range []string{"", "../x", "a/b", ".hidden", "sha256:ab cd"} {
		_, err := install(payload(t, "daemon-a"), t.TempDir(), digest)
		assert.Error(t, err, digest)
	}
}
