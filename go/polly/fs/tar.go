package fs

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type tarOptions struct {
	include  func(name string) bool
	symlinks bool
}

// TarOption customizes UntarStream.
type TarOption func(*tarOptions)

// WithTarFilter extracts only the entries whose cleaned, slash-separated name include accepts.
func WithTarFilter(include func(name string) bool) TarOption {
	return func(o *tarOptions) { o.include = include }
}

// WithTarSymlinks also extracts symlinks, which must be relative and stay inside the destination. They are ignored by
// default.
func WithTarSymlinks() TarOption {
	return func(o *tarOptions) { o.symlinks = true }
}

// Untar extracts a gzip-compressed tar stream into dst.
func Untar(dst string, r io.Reader) error {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return err
	}
	defer gzr.Close()

	return UntarStream(dst, gzr)
}

// UntarStream extracts an already decompressed tar stream into dst, so callers can bring their own decompression (zstd,
// xz, ...). Entries that would land outside dst are rejected.
func UntarStream(dst string, r io.Reader, opts ...TarOption) error {
	var o tarOptions
	for _, opt := range opts {
		opt(&o)
	}

	tr := tar.NewReader(r)
	madeDir := map[string]bool{}

	for {
		header, err := tr.Next()

		switch {
		// if no more files are found return
		case err == io.EOF:
			return nil

		// return any other error
		case err != nil:
			return err

		// if the header is nil, just skip it (not sure how this happens)
		case header == nil:
			continue
		}

		name := path.Clean(strings.TrimPrefix(strings.TrimPrefix(header.Name, "./"), "/"))
		if !filepath.IsLocal(filepath.FromSlash(name)) {
			return fmt.Errorf("tar entry %q escapes the extraction directory", header.Name)
		}
		if o.include != nil && !o.include(name) {
			continue
		}

		// the target location where the dir/file should be created
		target := filepath.Join(dst, filepath.FromSlash(name))

		// check the file type
		switch header.Typeflag {
		// if its a dir and it doesn't exist create it
		case tar.TypeDir:
			if err := makeDir(target, madeDir); err != nil {
				return err
			}

		// if it's a file create it
		case tar.TypeReg:
			if err := makeDir(filepath.Dir(target), madeDir); err != nil {
				return err
			}

			f, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR, os.FileMode(header.Mode))
			if err != nil {
				fmt.Println("could not open file")
				return err
			}

			// copy over contents
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}

			// manually close here after each file operation; defering would cause each file close
			// to wait until all operations have completed.
			f.Close()

		case tar.TypeSymlink:
			if !o.symlinks {
				continue
			}
			if path.IsAbs(header.Linkname) || !filepath.IsLocal(filepath.FromSlash(path.Join(path.Dir(name), header.Linkname))) {
				return fmt.Errorf("tar symlink %q points outside the extraction directory (%q)", header.Name, header.Linkname)
			}
			if err := makeDir(filepath.Dir(target), madeDir); err != nil {
				return err
			}
			_ = os.Remove(target)
			if err := os.Symlink(filepath.FromSlash(header.Linkname), target); err != nil {
				return err
			}
		}
	}
}

func makeDir(target string, made map[string]bool) error {
	if made[target] {
		return nil
	}

	if _, err := os.Stat(target); err != nil {
		if err := os.MkdirAll(target, 0755); err != nil {
			return err
		}
	}

	made[target] = true
	return nil
}
