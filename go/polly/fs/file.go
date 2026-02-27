package fs

import (
	"os"
)

func Exists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

func TmpFile(name string, contents []byte) (string, error) {
	f, err := os.CreateTemp("", name)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := f.Write(contents); err != nil {
		return "", err
	}

	return f.Name(), nil
}
