package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"flag"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestResolveDefaults(t *testing.T) {
	t.Setenv("CONSOLE_URL", "https://console.example.com/")
	t.Setenv("DEPLOY_TOKEN", "tok")
	t.Setenv("POD_NAMESPACE", "plrl")
	t.Setenv("DEVBOX_KAS_URL", "")
	o := register(flag.NewFlagSet("t", flag.ContinueOnError))
	if err := o.resolve(); err != nil {
		t.Fatal(err)
	}
	if o.kasURL != "wss://console.example.com/ext/devbox" {
		t.Errorf("kas = %s", o.kasURL)
	}
	if o.aiProxyURL != "https://console.example.com/ext/v1/ai" || o.workbenchMCP != "https://console.example.com/mcp/workbench" {
		t.Errorf("endpoints = %s, %s", o.aiProxyURL, o.workbenchMCP)
	}
	if o.gatewayHost != "devbox-gateway.plrl.svc" {
		t.Errorf("gateway host = %s", o.gatewayHost)
	}
	if o.actorIssuer != "https://idp.ate-system.svc" {
		t.Errorf("issuer = %s", o.actorIssuer)
	}
	if o.actorIssuerCA != "/run/servicedns-ca.podcert.ate.dev/trust-bundle.pem" {
		t.Errorf("issuer CA = %s", o.actorIssuerCA)
	}
	if portOf(o.mcpAddr, 0) != 8080 || o.credProvider != ":50052" || o.extProc != ":50053" || o.metricsAddr != ":9090" {
		t.Errorf("listeners = %s %s %s %s", o.mcpAddr, o.credProvider, o.extProc, o.metricsAddr)
	}
	if o.authzHost != "devbox-egress-authz.plrl.svc" {
		t.Errorf("authz host = %s", o.authzHost)
	}
	if got := splitList(o.egressIDs); len(got) != 1 || got[0] != "spiffe://cluster.local/ns/ate-system/sa/atenet-egress" {
		t.Errorf("egress SPIFFE IDs = %v", got)
	}
}

func TestEgressSPIFFEIDFollowsSubstrateNamespace(t *testing.T) {
	t.Setenv("CONSOLE_URL", "https://console.example.com")
	t.Setenv("DEPLOY_TOKEN", "tok")
	t.Setenv("DEVBOX_SUBSTRATE_NAMESPACE", "substrate")
	o := register(flag.NewFlagSet("t", flag.ContinueOnError))
	if err := o.resolve(); err != nil {
		t.Fatal(err)
	}
	if o.egressIDs != "spiffe://cluster.local/ns/substrate/sa/atenet-egress" {
		t.Errorf("egress SPIFFE IDs = %s", o.egressIDs)
	}
}

func TestMissingServingNames(t *testing.T) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		NotBefore:    time.Now().Add(-time.Minute),
		NotAfter:     time.Now().Add(time.Hour),
		DNSNames:     []string{"devbox-gateway.plrl.svc"},
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	bundle := filepath.Join(t.TempDir(), "credential-bundle.pem")
	data := append(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}), pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})...)
	if err := os.WriteFile(bundle, data, 0o600); err != nil {
		t.Fatal(err)
	}
	missing, err := missingServingNames(bundle, []string{"devbox-gateway.plrl.svc", "devbox-egress-authz.plrl.svc"})
	if err != nil || len(missing) != 1 || missing[0] != "devbox-egress-authz.plrl.svc" {
		t.Fatalf("missing = %v, %v", missing, err)
	}
}

func TestResolveRequiresToken(t *testing.T) {
	t.Setenv("CONSOLE_URL", "https://console.example.com")
	t.Setenv("DEPLOY_TOKEN", "")
	o := register(flag.NewFlagSet("t", flag.ContinueOnError))
	if err := o.resolve(); err == nil {
		t.Fatal("missing DEPLOY_TOKEN accepted")
	}
}
