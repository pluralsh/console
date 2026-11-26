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

// EnvVars are the variables that must point at the bundle: OpenSSL's, and those of the tools that keep their own
// trust store instead of reading it. Tools with no override read the system bundle, which the image links to
// ours. The image's ENV, its sudoers env_keep and its structure tests list the same variables.
var EnvVars = []string{
	"SSL_CERT_FILE",
	"CURL_CA_BUNDLE",
	"GIT_SSL_CAINFO",
	"AWS_CA_BUNDLE",
	"CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE",
	// Node, npm and pnpm; Deno 2.8+ and newer Bun read NODE_EXTRA_CA_CERTS too.
	"NODE_EXTRA_CA_CERTS",
	"NPM_CONFIG_CAFILE",
	"YARN_CAFILE",
	"YARN_HTTPS_CA_FILE_PATH",
	"DENO_CERT",
	// Python: requests (pip, poetry), pip, twine, conda.
	"REQUESTS_CA_BUNDLE",
	"PIP_CERT",
	"TWINE_CERT",
	"CONDA_SSL_VERIFY",
	"CARGO_HTTP_CAINFO",
	"HEX_CACERTS_PATH",
	"BUNDLE_SSL_CA_CERT",
	"NIX_SSL_CERT_FILE",
}

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
