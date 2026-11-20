package trust

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestImportJava(t *testing.T) {
	keytool := Keytool()
	if keytool == "" {
		t.Skip("no JDK")
	}
	if err := exec.Command(keytool, "-help").Run(); err != nil {
		t.Skipf("keytool unusable: %v", err)
	}
	dir := t.TempDir()
	ca := filepath.Join(dir, "egress.pem")
	if err := os.WriteFile(ca, certPEM(t, "egress-ca"), 0o644); err != nil {
		t.Fatal(err)
	}
	store := filepath.Join(dir, "java-cacerts")
	// keytool creates a missing store on import; make an empty one so ImportJava's existence check passes.
	gen := exec.Command(keytool, "-genkeypair", "-alias", "seed", "-keyalg", "RSA", "-dname", "CN=seed",
		"-keystore", store, "-storepass", JavaStorePassword, "-keypass", JavaStorePassword, "-storetype", "PKCS12")
	if out, err := gen.CombinedOutput(); err != nil {
		t.Fatalf("seed store: %v: %s", err, out)
	}

	certs := Certificates([]string{filepath.Join(dir, "*.pem")})
	if len(certs) != 1 {
		t.Fatalf("certificates: %d", len(certs))
	}
	for i, want := range []int{1, 0} {
		n, err := ImportJava(context.Background(), keytool, store, certs)
		if err != nil || n != want {
			t.Fatalf("import %d: n=%d err=%v, want %d", i, n, err, want)
		}
	}
	out, err := exec.Command(keytool, "-list", "-keystore", store, "-storepass", JavaStorePassword).CombinedOutput()
	if err != nil || !strings.Contains(string(out), "devbox-egress-") {
		t.Fatalf("store listing: %v: %s", err, out)
	}
}
