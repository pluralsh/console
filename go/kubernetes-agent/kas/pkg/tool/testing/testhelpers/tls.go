package testhelpers

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func GenerateCACert(t *testing.T) (string /* caCertFile */, string /* caKeyFile */, *x509.Certificate /* caCert */, crypto.PrivateKey /* caKey */) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	publicKey := privateKey.Public()
	spkiASN1, err := x509.MarshalPKIXPublicKey(publicKey)
	require.NoError(t, err)

	var spki struct {
		Algorithm        pkix.AlgorithmIdentifier
		SubjectPublicKey asn1.BitString
	}
	_, err = asn1.Unmarshal(spkiASN1, &spki)
	require.NoError(t, err)

	skid := sha256.Sum256(spki.SubjectPublicKey.Bytes)

	tpl := &x509.Certificate{
		SerialNumber: randomSerialNumber(t),
		Subject: pkix.Name{
			Organization:       []string{"Plural test CA"},
			OrganizationalUnit: []string{"group::environments"},
			CommonName:         "test CA cert",
		},
		SubjectKeyId: skid[:],

		NotAfter:  time.Now().Add(time.Hour),
		NotBefore: time.Now(),

		KeyUsage: x509.KeyUsageCertSign,

		BasicConstraintsValid: true,
		IsCA:                  true,
		MaxPathLenZero:        true,
	}

	tmp := t.TempDir()

	cert, err := x509.CreateCertificate(rand.Reader, tpl, tpl, publicKey, privateKey)
	require.NoError(t, err)

	certTyped, err := x509.ParseCertificate(cert)
	require.NoError(t, err)

	caCertFile := filepath.Join(tmp, "ca-cert.pem")
	err = os.WriteFile(caCertFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: cert}), 0600)
	require.NoError(t, err)

	privateDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	require.NoError(t, err)

	caKeyFile := filepath.Join(tmp, "ca-key.pem")
	err = os.WriteFile(caKeyFile, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privateDER}), 0400)
	require.NoError(t, err)

	return caCertFile, caKeyFile, certTyped, privateKey
}

func GenerateCert(t *testing.T, name string, caCert *x509.Certificate, caKey crypto.PrivateKey) (string /* certFile */, string /* keyFile */) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	publicKey := privateKey.Public()

	tpl := &x509.Certificate{
		SerialNumber: randomSerialNumber(t),
		Subject: pkix.Name{
			Organization:       []string{"Plural test certificate - " + name},
			OrganizationalUnit: []string{"group::environments"},
		},

		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(time.Hour),

		KeyUsage:    x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},

		IPAddresses: []net.IP{{127, 0, 0, 1}},
	}

	cert, err := x509.CreateCertificate(rand.Reader, tpl, caCert, publicKey, caKey)
	require.NoError(t, err)

	tmp := t.TempDir()

	certFile := filepath.Join(tmp, name+"-cert.pem")
	err = os.WriteFile(certFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: cert}), 0600)
	require.NoError(t, err)

	privateDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	require.NoError(t, err)
	keyFile := filepath.Join(tmp, name+"-key.pem")
	err = os.WriteFile(keyFile, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privateDER}), 0400)
	require.NoError(t, err)

	return certFile, keyFile
}

func randomSerialNumber(t *testing.T) *big.Int {
	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	require.NoError(t, err)

	return serialNumber
}
