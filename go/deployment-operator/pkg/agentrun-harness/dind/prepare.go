package dind

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

var clientCertFiles = []string{"ca.pem", "cert.pem", "key.pem"}

// PrepareClientEnv waits for dind TLS material, copies it into ClientCertStagingDir
// owned by the agent process, and points DOCKER_CERT_PATH at the staging directory.
// Pod env must already set DOCKER_HOST and DOCKER_TLS_VERIFY.
func PrepareClientEnv() error {
	if err := waitForFile(filepath.Join(ClientCertsPath, "ca.pem"), 2*time.Minute); err != nil {
		return fmt.Errorf("wait for dind client certs: %w", err)
	}

	if err := os.RemoveAll(ClientCertStagingDir); err != nil {
		return fmt.Errorf("reset docker cert staging dir: %w", err)
	}
	if err := os.MkdirAll(ClientCertStagingDir, 0o700); err != nil {
		return fmt.Errorf("create docker cert staging dir: %w", err)
	}

	for _, name := range clientCertFiles {
		src := filepath.Join(ClientCertsPath, name)
		dst := filepath.Join(ClientCertStagingDir, name)
		if err := copyFile(src, dst); err != nil {
			return fmt.Errorf("stage docker cert %q: %w", name, err)
		}
	}

	if err := os.Chmod(filepath.Join(ClientCertStagingDir, "key.pem"), 0o400); err != nil {
		return fmt.Errorf("chmod staged docker client key: %w", err)
	}

	if err := os.Setenv(DockerCertPathEnv, ClientCertStagingDir); err != nil {
		return fmt.Errorf("set %s: %w", DockerCertPathEnv, err)
	}

	return nil
}

func waitForFile(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if _, err := os.Stat(path); err == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timed out waiting for %q", path)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}
