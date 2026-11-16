package trust

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func certPEM(t *testing.T, cn string) []byte {
	t.Helper()
	k, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	tmpl := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: cn}, NotBefore: time.Now(),
		NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &k.PublicKey, k)
	if err != nil {
		t.Fatal(err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func TestBuildReplacesSymlinkAndDedupes(t *testing.T) {
	dir := t.TempDir()
	sys := filepath.Join(dir, "system.pem")
	egress := filepath.Join(dir, "egress", "trust-bundle.pem")
	_ = os.MkdirAll(filepath.Dir(egress), 0o755)
	sysCert, egressCert := certPEM(t, "system root"), certPEM(t, "egress ca")
	_ = os.WriteFile(sys, sysCert, 0o644)
	_ = os.WriteFile(egress, append(append([]byte{}, egressCert...), sysCert...), 0o644)
	out := filepath.Join(dir, "trust", "ca-bundle.pem")
	_ = os.MkdirAll(filepath.Dir(out), 0o755)
	if err := os.Symlink(sys, out); err != nil {
		t.Fatal(err)
	}
	n, err := Build(out, sys, []string{filepath.Join(dir, "egress", "*.pem")})
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("extra certs added %d, want 1 (the duplicate system root is skipped)", n)
	}
	fi, _ := os.Lstat(out)
	if fi.Mode()&os.ModeSymlink != 0 {
		t.Fatal("symlink not replaced")
	}
	data, _ := os.ReadFile(out)
	if strings.Count(string(data), "BEGIN CERTIFICATE") != 2 {
		t.Fatalf("bundle:\n%s", data)
	}
	if got, _ := os.ReadFile(sys); string(got) != string(sysCert) {
		t.Fatal("system bundle modified through the symlink")
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(data) {
		t.Fatal("bundle not parseable")
	}
}
