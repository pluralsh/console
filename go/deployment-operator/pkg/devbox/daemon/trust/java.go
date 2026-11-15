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
	"sort"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// JavaStorePassword is the JDK's default cacerts password.
const JavaStorePassword = "changeit"

// Keytool finds keytool ($JAVA_HOME/bin first, then PATH); "" when no JDK is installed.
func Keytool() string {
	if jh := os.Getenv("JAVA_HOME"); jh != "" {
		if p := filepath.Join(jh, "bin", "keytool"); isExec(p) {
			return p
		}
	}
	p, err := exec.LookPath("keytool")
	if err != nil {
		return ""
	}
	return p
}

func isExec(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && !fi.IsDir() && fi.Mode()&0o111 != 0
}

// Certificates returns the DER certificates in the PEM files matched by globs.
func Certificates(globs []string) [][]byte {
	var files []string
	for _, g := range globs {
		m, _ := filepath.Glob(g)
		files = append(files, m...)
	}
	sort.Strings(files)
	var out [][]byte
	seen := map[string]bool{}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		for {
			var blk *pem.Block
			blk, data = pem.Decode(data)
			if blk == nil {
				break
			}
			if blk.Type == "CERTIFICATE" && !seen[string(blk.Bytes)] {
				seen[string(blk.Bytes)] = true
				out = append(out, blk.Bytes)
			}
		}
	}
	return out
}

// ImportJava adds certs to a Java truststore (the image's writable java-cacerts, which the JDK's cacerts links to)
// with keytool. Certificates already present (by alias) are skipped. It returns how many were imported.
func ImportJava(ctx context.Context, keytool, store string, certs [][]byte) (int, error) {
	if keytool == "" || len(certs) == 0 {
		return 0, nil
	}
	if _, err := os.Stat(store); err != nil {
		return 0, fmt.Errorf("java truststore: %w", err)
	}
	tmp, err := os.MkdirTemp("", "devbox-ca-")
	if err != nil {
		return 0, err
	}
	defer os.RemoveAll(tmp)
	run := func(args ...string) ([]byte, error) {
		cctx, cancel := context.WithTimeout(ctx, time.Minute)
		defer cancel()
		cmd := exec.CommandContext(cctx, keytool, append(args, "-keystore", store, "-storepass", JavaStorePassword)...)
		return proc.Output(cmd)
	}
	n := 0
	for _, der := range certs {
		sum := sha256.Sum256(der)
		alias := "devbox-egress-" + hex.EncodeToString(sum[:6])
		if _, err := run("-list", "-alias", alias); err == nil {
			continue
		}
		f := filepath.Join(tmp, alias+".pem")
		if err := os.WriteFile(f, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o600); err != nil {
			return n, err
		}
		if out, err := run("-importcert", "-noprompt", "-trustcacerts", "-alias", alias, "-file", f); err != nil {
			return n, fmt.Errorf("keytool -importcert: %w: %s", err, strings.TrimSpace(string(out)))
		}
		n++
	}
	return n, nil
}
