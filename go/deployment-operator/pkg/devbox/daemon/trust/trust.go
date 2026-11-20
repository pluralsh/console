// Package trust builds the sandbox's CA bundle: the system roots plus the egress gateway's interception CA, written
// to the writable trust store that SSL_CERT_FILE, NODE_EXTRA_CA_CERTS, REQUESTS_CA_BUNDLE and GIT_SSL_CAINFO point at.
package trust

import (
	"bytes"
	"encoding/pem"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// DefaultSystemBundle is Debian's system bundle.
const DefaultSystemBundle = "/etc/ssl/certs/ca-certificates.crt"

// DefaultEgressCAGlobs are where Substrate projects the egress trust bundle.
var DefaultEgressCAGlobs = []string{"/run/ate/egress-trust-bundle/*.pem", "/var/run/ate/egress-trust-bundle/*.pem"}

// EnvVars are the variables that must point at the bundle.
var EnvVars = []string{"SSL_CERT_FILE", "NODE_EXTRA_CA_CERTS", "REQUESTS_CA_BUNDLE", "GIT_SSL_CAINFO", "CURL_CA_BUNDLE", "AWS_CA_BUNDLE"}

// Build writes system + extra certificates to out (replacing a symlink with a file) and returns the number of
// extra certificates added. Duplicate certificates are written once.
func Build(out, system string, extraGlobs []string) (int, error) {
	var buf bytes.Buffer
	seen := map[string]bool{}
	add := func(data []byte) int {
		n := 0
		for {
			var blk *pem.Block
			blk, data = pem.Decode(data)
			if blk == nil {
				return n
			}
			if blk.Type != "CERTIFICATE" {
				continue
			}
			key := string(blk.Bytes)
			if seen[key] {
				continue
			}
			seen[key] = true
			_ = pem.Encode(&buf, &pem.Block{Type: "CERTIFICATE", Bytes: blk.Bytes})
			n++
		}
	}
	if system != "" {
		data, err := os.ReadFile(system)
		if err != nil && !os.IsNotExist(err) {
			return 0, err
		}
		add(data)
	}
	extra := 0
	var files []string
	for _, g := range extraGlobs {
		m, _ := filepath.Glob(g)
		files = append(files, m...)
	}
	sort.Strings(files)
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		extra += add(data)
	}
	if buf.Len() == 0 {
		return 0, fmt.Errorf("no certificates found")
	}
	if fi, err := os.Lstat(out); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		if err := os.Remove(out); err != nil {
			return 0, err
		}
	}
	return extra, fsutil.WriteFileAtomic(out, buf.Bytes(), 0o644)
}
