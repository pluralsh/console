package fs

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCopyDir(t *testing.T) {
	src := t.TempDir()
	nested := filepath.Join(src, "nested")
	require.NoError(t, os.Mkdir(nested, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(src, "root.txt"), []byte("root"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(nested, "child.txt"), []byte("child"), 0644))
	require.NoError(t, os.Chmod(filepath.Join(nested, "child.txt"), 0755))
	require.NoError(t, os.Symlink("root.txt", filepath.Join(src, "link.txt")))

	dst := filepath.Join(t.TempDir(), "copy")
	require.NoError(t, CopyDir(src, dst))

	root, err := os.ReadFile(filepath.Join(dst, "root.txt"))
	require.NoError(t, err)
	assert.Equal(t, "root", string(root))

	child, err := os.ReadFile(filepath.Join(dst, "nested", "child.txt"))
	require.NoError(t, err)
	assert.Equal(t, "child", string(child))

	link, err := os.Readlink(filepath.Join(dst, "link.txt"))
	require.NoError(t, err)
	assert.Equal(t, "root.txt", link)

	info, err := os.Stat(filepath.Join(dst, "nested", "child.txt"))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0755), info.Mode().Perm())
}

func TestCopyDirRejectsExistingDestination(t *testing.T) {
	src := t.TempDir()
	dst := t.TempDir()
	err := CopyDir(src, dst)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestCopyDirRejectsFileSource(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "file")
	require.NoError(t, os.WriteFile(src, []byte("x"), 0644))
	err := CopyDir(src, filepath.Join(dir, "dst"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not a directory")
}
