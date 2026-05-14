package manifests

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

func Untar(dst string, r io.Reader) (err error) {
	log.V(1).Info("beginning to Untar stream")

	gzr, err := gzip.NewReader(r)
	if err != nil {
		return
	}
	defer func(gzr *gzip.Reader) {
		closeErr := gzr.Close()
		if closeErr != nil && err == nil {
			err = closeErr
		}
		empty, dirErr := IsDirEmpty(dst)
		if dirErr != nil && err == nil {
			err = dirErr
		}
		if empty && err == nil {
			err = fmt.Errorf("Untar failed, directory is empty")
		}
	}(gzr)

	tr := tar.NewReader(gzr)
	madeDir := map[string]bool{}

	for {
		header, err := tr.Next()
		switch {
		case err == io.EOF:
			return nil
		case err != nil:
			return fmt.Errorf("error reading tar entry: %w", err)
		case header == nil:
			continue
		}

		target := filepath.Join(dst, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := makeDir(target, madeDir); err != nil {
				return fmt.Errorf("error creating directory %s: %w", target, err)
			}

		case tar.TypeReg:
			if err := makeDir(filepath.Dir(target), madeDir); err != nil {
				return fmt.Errorf("error creating parent directory for file %s: %w", target, err)
			}

			f, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				log.Error(err, "failed to open file for writing", "path", target)
				return fmt.Errorf("failed to open file %s: %w", target, err)
			}

			_, copyErr := copyBuffered(f, tr)
			closeErr := f.Close()

			if copyErr != nil {
				return fmt.Errorf("error copying to file %s: %w", target, copyErr)
			}
			if closeErr != nil {
				log.Error(closeErr, "failed to close file", "path", target)
			}

		default:
			log.V(1).Info("skipping unsupported tar entry", "type", header.Typeflag, "name", header.Name)
		}
	}
}
func IsDirEmpty(path string) (bool, error) {
	// Open the directory
	dir, err := os.Open(path)
	if err != nil {
		return false, err
	}
	defer func(dir *os.File) {
		err := dir.Close()
		if err != nil {
			return
		}
	}(dir)

	// Read directory contents
	contents, err := dir.Readdirnames(1) // Read at least 1 name
	if err != nil && !errors.Is(err, io.EOF) {
		return false, err
	}

	return len(contents) == 0, nil
}

func makeDir(target string, made map[string]bool) error {
	if made[target] {
		return nil
	}

	if _, err := os.Stat(target); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to stat directory %q: %w", target, err)
		}
		if err := os.MkdirAll(target, 0755); err != nil {
			return fmt.Errorf("failed to create directory %q: %w", target, err)
		}
	}

	made[target] = true
	return nil
}

var bufPool = &sync.Pool{
	New: func() any {
		buffer := make([]byte, 64*1024)
		return &buffer
	},
}

func copyBuffered(dst io.Writer, src io.Reader) (int64, error) {
	buf := bufPool.Get().(*[]byte)
	defer bufPool.Put(buf)

	var written int64
	for {
		nr, er := src.Read(*buf)
		if nr > 0 {
			nw, ew := dst.Write((*buf)[:nr])
			if ew != nil {
				return written, fmt.Errorf("write error: %w", ew)
			}
			if nr != nw {
				return written, io.ErrShortWrite
			}
			written += int64(nw)
		}
		if er != nil {
			if er == io.EOF {
				break
			}
			return written, fmt.Errorf("read error: %w", er)
		}
	}
	return written, nil
}
