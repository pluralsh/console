package common

import "os"

func CopyFile(src, dest string) error {
	bytesRead, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	return os.WriteFile(dest, bytesRead, 0644)
}
