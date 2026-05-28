package artifacts

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type TarSessionArchiveWriter struct{}

type tarSourceWriter struct {
	tw          *tar.Writer
	source      SessionSource
	archivePath string
}

func (in *TarSessionArchiveWriter) Write(path string, manifest *SessionManifest, source *SessionSource) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create session archive: %w", err)
	}
	defer file.Close()

	gzipWriter := gzip.NewWriter(file)
	defer gzipWriter.Close()

	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	if err := in.writeManifest(tarWriter, manifest); err != nil {
		return err
	}

	if source != nil {
		if err := in.writeSource(tarWriter, *source); err != nil {
			return err
		}
	}

	return nil
}

func (in *TarSessionArchiveWriter) writeManifest(tw *tar.Writer, manifest *SessionManifest) error {
	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal session manifest: %w", err)
	}
	return in.writeBytes(tw, "manifest.json", manifestBytes, 0644)
}

func (in *TarSessionArchiveWriter) writeBytes(tw *tar.Writer, name string, data []byte, mode int64) error {
	header := &tar.Header{
		Name:    filepath.ToSlash(name),
		Mode:    mode,
		Size:    int64(len(data)),
		ModTime: time.Now().UTC(),
	}
	if err := tw.WriteHeader(header); err != nil {
		return fmt.Errorf("write tar header %q: %w", name, err)
	}
	if _, err := tw.Write(data); err != nil {
		return fmt.Errorf("write tar entry %q: %w", name, err)
	}
	return nil
}

func (in *TarSessionArchiveWriter) writeSource(tw *tar.Writer, source SessionSource) error {
	writer := &tarSourceWriter{
		tw:          tw,
		source:      source,
		archivePath: filepath.ToSlash(strings.TrimPrefix(filepath.Clean(source.ArchivePath), string(filepath.Separator))),
	}
	return writer.Write()
}

func (in *tarSourceWriter) Write() error {
	return filepath.WalkDir(in.source.Path, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		return in.writeEntry(path, entry)
	})
}

func (in *tarSourceWriter) writeEntry(path string, entry os.DirEntry) error {
	rel, err := filepath.Rel(in.source.Path, path)
	if err != nil {
		return err
	}
	if in.shouldExclude(rel, entry) {
		if entry.IsDir() {
			return filepath.SkipDir
		}
		return nil
	}

	info, err := entry.Info()
	if err != nil {
		return err
	}

	link, err := in.readSymlink(path, info)
	if err != nil {
		return err
	}

	if err := in.writeHeader(info, link, in.entryName(rel)); err != nil {
		return err
	}

	if entry.IsDir() || link != "" || !info.Mode().IsRegular() {
		return nil
	}

	return in.writeFile(path)
}

func (in *tarSourceWriter) shouldExclude(rel string, entry os.DirEntry) bool {
	if rel == "." {
		return false
	}

	for _, excluded := range in.source.ExcludeNames {
		if entry.Name() == excluded {
			return true
		}
	}
	return false
}

func (in *tarSourceWriter) entryName(rel string) string {
	if rel == "." {
		return in.archivePath
	}
	return filepath.ToSlash(filepath.Join(in.archivePath, rel))
}

func (in *tarSourceWriter) readSymlink(path string, info os.FileInfo) (string, error) {
	if info.Mode()&os.ModeSymlink == 0 {
		return "", nil
	}

	link, err := os.Readlink(path)
	if err != nil {
		return "", fmt.Errorf("read symlink %q: %w", path, err)
	}
	return link, nil
}

func (in *tarSourceWriter) writeHeader(info os.FileInfo, link, name string) error {
	header, err := tar.FileInfoHeader(info, link)
	if err != nil {
		return err
	}
	header.Name = name
	if err := in.tw.WriteHeader(header); err != nil {
		return fmt.Errorf("write tar header %q: %w", header.Name, err)
	}
	return nil
}

func (in *tarSourceWriter) writeFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	if _, err := io.Copy(in.tw, file); err != nil {
		return fmt.Errorf("write tar file %q: %w", path, err)
	}
	return nil
}
