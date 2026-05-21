package codex

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
)

func TestBuildCodexConfig_ProxyProvider(t *testing.T) {
	consoleURL := "https://console.plural.sh"
	model := proxymodel.ProxyModel(console.AgentRuntimeTypeCodex, "gpt-5.4")

	cfg, err := BuildCodexConfig("/repo", []AgentInput{{
		Name:          autonomousProfile,
		SandboxMode:   sandboxModeHarness,
		Model:         model,
		ModelProvider: "plural",
	}}, nil, []ModelProviderInput{{
		Name:    "plural",
		BaseURL: fmt.Sprintf("%s/ext/ai/v1", consoleURL),
		EnvKey:  consoleTokenEnv,
	}})
	if err != nil {
		t.Fatalf("BuildCodexConfig() failed: %v", err)
	}

	provider := cfg.ModelProviders["plural"]
	if provider == nil {
		t.Fatal("expected plural model provider")
	}
	if provider.BaseURL != "https://console.plural.sh/ext/ai/v1" {
		t.Fatalf("base_url = %q, want https://console.plural.sh/ext/ai/v1", provider.BaseURL)
	}
	if provider.EnvKey != consoleTokenEnv {
		t.Fatalf("env_key = %q, want %q", provider.EnvKey, consoleTokenEnv)
	}
}

func TestBuildCodexConfig_ModelInstructionsFileAndDindEnvVars(t *testing.T) {
	t.Setenv(dind.DockerHostEnv, dind.DockerHostValue)
	t.Setenv(dind.DockerTLSVerifyEnv, "1")
	t.Setenv(dind.DockerCertPathEnv, dind.ClientCertStagingDir)

	t.Run("sets model_instructions_file on profile", func(t *testing.T) {
		instructionsFile := filepath.Join(t.TempDir(), "AGENTS.md")
		if err := os.WriteFile(instructionsFile, []byte("Use docker for tests."), 0644); err != nil {
			t.Fatal(err)
		}

		cfg, err := BuildCodexConfig("/repo", []AgentInput{{
			Name:                  autonomousProfile,
			SandboxMode:           sandboxModeHarness,
			ApprovalPolicy:        "never",
			ModelInstructionsFile: instructionsFile,
		}}, nil, nil)
		if err != nil {
			t.Fatalf("BuildCodexConfig() failed: %v", err)
		}

		profile := cfg.Profiles[autonomousProfile]
		if profile == nil {
			t.Fatalf("expected profile %q", autonomousProfile)
		}
		if profile.ModelInstructionsFile != instructionsFile {
			t.Fatalf("expected model_instructions_file %q, got %q", instructionsFile, profile.ModelInstructionsFile)
		}
		if profile.SandboxMode != sandboxModeHarness {
			t.Fatalf("expected sandbox_mode %q, got %q", sandboxModeHarness, profile.SandboxMode)
		}
	})

	t.Run("includes docker env vars when dind enabled", func(t *testing.T) {
		vars := codexAllowedEnvVars(true)
		for _, want := range []string{dind.DockerHostEnv, dind.DockerTLSVerifyEnv, dind.DockerCertPathEnv} {
			if !containsString(vars, want) {
				t.Fatalf("expected %q in allowed env vars, got %v", want, vars)
			}
		}
	})

	t.Run("omits docker env vars when dind disabled", func(t *testing.T) {
		vars := codexAllowedEnvVars(false)
		for _, unwanted := range []string{dind.DockerHostEnv, dind.DockerTLSVerifyEnv, dind.DockerCertPathEnv} {
			if containsString(vars, unwanted) {
				t.Fatalf("did not expect %q in allowed env vars, got %v", unwanted, vars)
			}
		}
	})
}

func TestBuildCodexConfig_DindShellEnvWithoutCodexSandbox(t *testing.T) {
	t.Setenv(dind.DockerHostEnv, dind.DockerHostValue)
	t.Setenv(dind.DockerTLSVerifyEnv, "1")
	t.Setenv(dind.DockerCertPathEnv, dind.ClientCertStagingDir)

	instructionsFile := filepath.Join(t.TempDir(), "AGENTS.md")
	if err := os.WriteFile(instructionsFile, []byte("Docker-in-Docker is enabled."), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := BuildCodexConfig("/repo", []AgentInput{{
		Name:                  autonomousProfile,
		SandboxMode:           sandboxModeHarness,
		ApprovalPolicy:        "never",
		ModelInstructionsFile: instructionsFile,
		DindEnabled:           true,
	}}, nil, nil)
	if err != nil {
		t.Fatalf("BuildCodexConfig() failed: %v", err)
	}

	profile := cfg.Profiles[autonomousProfile]
	if profile.SandboxMode != sandboxModeHarness {
		t.Fatalf("expected sandbox_mode %q, got %q", sandboxModeHarness, profile.SandboxMode)
	}
	if profile.SandboxWorkspaceWrite != nil {
		t.Fatalf("did not expect sandbox_workspace_write when using %q, got %#v", sandboxModeHarness, profile.SandboxWorkspaceWrite)
	}
	if profile.ShellEnvironmentPolicy == nil {
		t.Fatal("expected shell environment policy")
	}
	if profile.ShellEnvironmentPolicy.Set[dind.DockerHostEnv] != dind.DockerHostValue {
		t.Fatalf("expected explicit DOCKER_HOST in shell env set, got %#v", profile.ShellEnvironmentPolicy.Set)
	}
	if profile.ShellEnvironmentPolicy.Set[dind.DockerCertPathEnv] != dind.ClientCertStagingDir {
		t.Fatalf("expected staged DOCKER_CERT_PATH in shell env set, got %#v", profile.ShellEnvironmentPolicy.Set)
	}
}

func TestCodexExecArgs(t *testing.T) {
	repositoryDir := dind.RepositoryDir()
	args := codexExecArgs(repositoryDir, autonomousProfile, "run tests")
	want := []string{
		"exec",
		"--sandbox", sandboxModeHarness,
		"--cd", repositoryDir,
		"--profile", autonomousProfile,
		"--json", "run tests",
	}
	if len(args) != len(want) {
		t.Fatalf("expected %d args, got %d: %v", len(want), len(args), args)
	}
	for i := range want {
		if args[i] != want[i] {
			t.Fatalf("arg[%d]: expected %q, got %q (full: %v)", i, want[i], args[i], args)
		}
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
