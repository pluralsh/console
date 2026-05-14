package helpers

import (
	"os"
	"path/filepath"
)

var (
	file FileClient = &fileClient{}
)

type FileClient interface {
	Create(path, content string, perm os.FileMode) error
}

func File() FileClient {
	return file
}

type fileClient struct{}

func (in *fileClient) Create(path, content string, perm os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	return os.WriteFile(path, []byte(content), perm)
}
