package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/go-logr/logr"
)

// serviceDNSTLS serves with a PEM credential bundle (key and chain in one file), re-read on every handshake so
// pod certificate rotation needs no restart.
func serviceDNSTLS(bundle string) *tls.Config {
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		NextProtos: []string{"h2", "http/1.1"},
		GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
			data, err := os.ReadFile(bundle)
			if err != nil {
				return nil, err
			}
			cert, err := tls.X509KeyPair(data, data)
			return &cert, err
		},
	}
}

// missingServingNames returns the names the serving certificate in bundle has no DNS SAN for.
func missingServingNames(bundle string, names []string) ([]string, error) {
	data, err := os.ReadFile(bundle)
	if err != nil {
		return nil, err
	}
	pair, err := tls.X509KeyPair(data, data)
	if err != nil {
		return nil, fmt.Errorf("parsing %s: %w", bundle, err)
	}
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		return nil, err
	}
	var missing []string
	for _, n := range names {
		if !slices.ContainsFunc(leaf.DNSNames, func(s string) bool { return strings.EqualFold(s, n) }) {
			missing = append(missing, n)
		}
	}
	return missing, nil
}

// checkServingNames warns while the servicedns pod certificate lacks a name atenet-egress dials. The signer issues
// one SAN per Service selecting the pod at issuance, so a pod that started before both Services existed serves
// an incomplete certificate until the kubelet renews it.
func checkServingNames(ctx context.Context, bundle string, names []string, log logr.Logger) {
	t := time.NewTicker(10 * time.Minute)
	defer t.Stop()
	for {
		missing, err := missingServingNames(bundle, names)
		switch {
		case err != nil:
			log.Info("WARNING: can't read the servicedns serving certificate", "bundle", bundle, "error", err.Error())
		case len(missing) > 0:
			log.Info("WARNING: the servicedns serving certificate lacks names atenet-egress verifies; restart the gateway pods once both Services exist",
				"missing", missing, "bundle", bundle)
		default:
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
