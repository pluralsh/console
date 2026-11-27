package trust

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// Certutil finds NSS's certutil (libnss3-tools); "" when the image doesn't ship it.
func Certutil() string {
	p, err := exec.LookPath("certutil")
	if err != nil {
		return ""
	}
	return p
}

// NSSDir is the NSS database Chromium on Linux reads user-added trust anchors from. Chromium ignores the system
// bundle and SSL_CERT_FILE, so this is the only way it trusts the egress interception CA.
func NSSDir(home string) string { return filepath.Join(home, ".pki", "nssdb") }

// ImportNSS trusts certs as TLS server CAs in the NSS database at dir, creating the database if it's missing.
// Certificates already present (by nickname) are skipped. It returns how many were imported.
func ImportNSS(ctx context.Context, certutil, dir string, certs [][]byte) (int, error) {
	if certutil == "" || len(certs) == 0 {
		return 0, nil
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return 0, err
	}
	run := func(args ...string) ([]byte, error) {
		cctx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		return proc.Output(exec.CommandContext(cctx, certutil, append([]string{"-d", "sql:" + dir}, args...)...))
	}
	if _, err := os.Stat(filepath.Join(dir, "cert9.db")); os.IsNotExist(err) {
		if out, err := run("-N", "--empty-password"); err != nil {
			return 0, fmt.Errorf("certutil -N: %w: %s", err, strings.TrimSpace(string(out)))
		}
	}
	tmp, err := os.MkdirTemp("", "devbox-ca-")
	if err != nil {
		return 0, err
	}
	defer os.RemoveAll(tmp)
	n := 0
	for _, der := range certs {
		sum := sha256.Sum256(der)
		nick := "devbox-egress-" + hex.EncodeToString(sum[:6])
		if _, err := run("-L", "-n", nick); err == nil {
			continue
		}
		f := filepath.Join(tmp, nick+".pem")
		if err := os.WriteFile(f, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600); err != nil {
			return n, err
		}
		if out, err := run("-A", "-n", nick, "-t", "C,,", "-i", f); err != nil {
			return n, fmt.Errorf("certutil -A: %w: %s", err, strings.TrimSpace(string(out)))
		}
		n++
	}
	return n, nil
}
