package config

import (
	"strings"
	"testing"
)

func TestVSphereConfigurationQuery(t *testing.T) {
	cfg := NewVSphereConfiguration(
		WithVSphereServer("https://vcenter.example.com/sdk"),
		WithVSphereUser("administrator@vsphere.local"),
		WithVSpherePassword("secret"),
		WithVSphereAllowUnverifiedSSL(true),
	)

	query, err := cfg.Query("connection")
	if err != nil {
		t.Fatalf("expected query, got error: %v", err)
	}

	assertContains(t, query, "FOREIGN DATA WRAPPER steampipe_postgres_vsphere")
	assertContains(t, query, `vsphere_server="https://vcenter.example.com/sdk"`)
	assertContains(t, query, `user="administrator@vsphere.local"`)
	assertContains(t, query, `password="secret"`)
	assertContains(t, query, "allow_unverified_ssl=true")
	assertContains(t, query, `IMPORT FOREIGN SCHEMA "connection" FROM SERVER "steampipe_connection" INTO "connection"`)
}

func TestVSphereConfigurationQueryRequiresServerUserAndPassword(t *testing.T) {
	tests := []struct {
		name      string
		cfg       Configuration
		wantError string
	}{
		{
			name: "server",
			cfg: NewVSphereConfiguration(
				WithVSphereUser("user"),
				WithVSpherePassword("secret"),
			),
			wantError: "vsphere server is required",
		},
		{
			name: "user",
			cfg: NewVSphereConfiguration(
				WithVSphereServer("https://vcenter.example.com/sdk"),
				WithVSpherePassword("secret"),
			),
			wantError: "vsphere user is required",
		},
		{
			name: "password",
			cfg: NewVSphereConfiguration(
				WithVSphereServer("https://vcenter.example.com/sdk"),
				WithVSphereUser("user"),
			),
			wantError: "vsphere password is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := tt.cfg.Query("connection")
			if err == nil {
				t.Fatal("expected error")
			}
			if !strings.Contains(err.Error(), tt.wantError) {
				t.Fatalf("expected error %q, got %q", tt.wantError, err.Error())
			}
		})
	}
}

func TestVSphereConfigurationSHAIncludesAllowUnverifiedSSL(t *testing.T) {
	cfg := NewVSphereConfiguration(
		WithVSphereServer("https://vcenter.example.com/sdk"),
		WithVSphereUser("administrator@vsphere.local"),
		WithVSpherePassword("secret"),
		WithVSphereAllowUnverifiedSSL(true),
	)

	sha, err := cfg.SHA()
	if err != nil {
		t.Fatalf("expected sha, got error: %v", err)
	}
	if sha == "" {
		t.Fatal("expected non-empty sha")
	}
}
