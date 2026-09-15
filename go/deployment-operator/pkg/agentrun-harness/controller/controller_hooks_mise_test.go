package controller

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	operatorctrl "github.com/pluralsh/console/go/deployment-operator/internal/controller"
)

func TestRunMiseBootstrap_SkipWhenConfigMissing(t *testing.T) {
	orig := miseConfigPath
	miseConfigPath = filepath.Join(t.TempDir(), "missing.toml")
	t.Cleanup(func() { miseConfigPath = orig })

	in := &agentRunController{dir: t.TempDir()}
	if err := in.runMiseBootstrap(); err != nil {
		t.Fatalf("runMiseBootstrap() missing config: %v", err)
	}
}

func TestRunMiseBootstrap_TrustAndBootstrap(t *testing.T) {
	dir := t.TempDir()
	cfg := filepath.Join(dir, "config.toml")
	if err := os.WriteFile(cfg, []byte("[tools]\nnode = \"24\"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	orig := miseConfigPath
	miseConfigPath = cfg
	t.Cleanup(func() { miseConfigPath = orig })

	logFile := filepath.Join(t.TempDir(), "mise.log")
	binDir := t.TempDir()
	script := "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"" + logFile + "\"\n"
	if err := os.WriteFile(filepath.Join(binDir, "mise"), []byte(script), 0755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv(operatorctrl.EnvMiseBootstrap, "true")
	dataDir := t.TempDir()
	t.Setenv(operatorctrl.EnvMiseDataDir, dataDir)

	in := &agentRunController{dir: dir}
	if err := os.MkdirAll(in.repositoryDir(), 0755); err != nil {
		t.Fatal(err)
	}
	if err := in.runMiseBootstrap(); err != nil {
		t.Fatalf("runMiseBootstrap() = %v", err)
	}

	body, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatal(err)
	}
	got := string(body)
	if !strings.Contains(got, "trust --all") {
		t.Fatalf("expected trust --all, got %q", got)
	}
	if !strings.Contains(got, "bootstrap --yes") {
		t.Fatalf("expected bootstrap --yes, got %q", got)
	}
	if !strings.Contains(os.Getenv("PATH"), filepath.Join(dataDir, "shims")) {
		t.Fatalf("expected mise shims on PATH, got %q", os.Getenv("PATH"))
	}
}

func TestRunMiseBootstrap_TrustOnlyWhenReadOnly(t *testing.T) {
	dir := t.TempDir()
	cfg := filepath.Join(dir, "config.toml")
	if err := os.WriteFile(cfg, []byte("[tools]\nnode = \"24\"\n"), 0644); err != nil {
		t.Fatal(err)
	}

	orig := miseConfigPath
	miseConfigPath = cfg
	t.Cleanup(func() { miseConfigPath = orig })

	logFile := filepath.Join(t.TempDir(), "mise.log")
	binDir := t.TempDir()
	script := "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"" + logFile + "\"\n"
	if err := os.WriteFile(filepath.Join(binDir, "mise"), []byte(script), 0755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv(operatorctrl.EnvMiseBootstrap, "false")
	t.Setenv(operatorctrl.EnvMiseDataDir, t.TempDir())

	in := &agentRunController{dir: dir}
	if err := os.MkdirAll(in.repositoryDir(), 0755); err != nil {
		t.Fatal(err)
	}
	if err := in.runMiseBootstrap(); err != nil {
		t.Fatalf("runMiseBootstrap() = %v", err)
	}

	body, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatal(err)
	}
	got := string(body)
	if !strings.Contains(got, "trust --all") {
		t.Fatalf("expected trust --all, got %q", got)
	}
	if strings.Contains(got, "bootstrap --yes") {
		t.Fatalf("did not expect bootstrap --yes, got %q", got)
	}
}
