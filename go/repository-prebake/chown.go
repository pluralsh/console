package prebake

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func parseChown(spec string) (uid, gid int, err error) {
	spec = strings.TrimSpace(spec)
	if spec == "" {
		return 0, 0, fmt.Errorf("empty --chown value")
	}
	parts := strings.Split(spec, ":")
	if len(parts) > 2 {
		return 0, 0, fmt.Errorf("invalid --chown %q", spec)
	}
	uid, err = strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid --chown uid %q: %w", parts[0], err)
	}
	if len(parts) == 1 {
		return uid, uid, nil
	}
	gid, err = strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid --chown gid %q: %w", parts[1], err)
	}
	return uid, gid, nil
}

func chownTree(root string, uid, gid int) error {
	return filepath.WalkDir(root, func(path string, _ fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if err := os.Chown(path, uid, gid); err != nil {
			return fmt.Errorf("chown %s: %w", path, err)
		}
		return nil
	})
}
