package trust

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestImportNSS(t *testing.T) {
	certutil := Certutil()
	if certutil == "" {
		t.Skip("no certutil")
	}
	dir := t.TempDir()
	ca := filepath.Join(dir, "egress.pem")
	if err := os.WriteFile(ca, certPEM(t, "egress-ca"), 0o644); err != nil {
		t.Fatal(err)
	}
	certs := Certificates([]string{ca})
	db := NSSDir(filepath.Join(dir, "home"))

	for i, want := range []int{1, 0} {
		n, err := ImportNSS(context.Background(), certutil, db, certs)
		if err != nil || n != want {
			t.Fatalf("import %d: n=%d err=%v, want %d", i, n, err, want)
		}
	}
	out, err := exec.Command(certutil, "-d", "sql:"+db, "-L").CombinedOutput()
	if err != nil {
		t.Fatalf("listing: %v: %s", err, out)
	}
	line := ""
	for _, l := range strings.Split(string(out), "\n") {
		if strings.HasPrefix(l, "devbox-egress-") {
			line = l
		}
	}
	if !strings.HasSuffix(strings.TrimSpace(line), "C,,") {
		t.Fatalf("the egress CA isn't trusted for TLS: %q in\n%s", line, out)
	}
}
