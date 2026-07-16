package pulumi

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHasChanges(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	previewOutput, err := json.Marshal(previewJSON{
		ChangeSummary: map[string]int{"create": 1},
	})
	require.NoError(t, err)

	scriptContent := `#!/bin/sh
if [ "$1" = "preview" ] && [ "$2" = "--json" ]; then
  cat <<'EOF'
` + string(previewOutput) + `
EOF
  exit 0
fi
echo "unexpected command: $*" >&2
exit 1
`
	require.NoError(t, os.WriteFile(script, []byte(scriptContent), 0o755))

	oldPath := os.Getenv("PATH")
	t.Cleanup(func() { _ = os.Setenv("PATH", oldPath) })
	require.NoError(t, os.Setenv("PATH", tmpDir+":"+oldPath))

	tool := (&Pulumi{dir: tmpDir, stackName: "dev"}).init().(*Pulumi)
	hasChanges, err := tool.HasChanges()
	require.NoError(t, err)
	assert.True(t, hasChanges)
}

func TestHasChangesNoOp(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	previewOutput, err := json.Marshal(previewJSON{
		ChangeSummary: map[string]int{"same": 3},
	})
	require.NoError(t, err)

	scriptContent := `#!/bin/sh
if [ "$1" = "preview" ] && [ "$2" = "--json" ]; then
  cat <<'EOF'
` + string(previewOutput) + `
EOF
  exit 0
fi
echo "unexpected command: $*" >&2
exit 1
`
	require.NoError(t, os.WriteFile(script, []byte(scriptContent), 0o755))

	oldPath := os.Getenv("PATH")
	t.Cleanup(func() { _ = os.Setenv("PATH", oldPath) })
	require.NoError(t, os.Setenv("PATH", tmpDir+":"+oldPath))

	tool := (&Pulumi{dir: tmpDir, stackName: "dev"}).init().(*Pulumi)
	hasChanges, err := tool.HasChanges()
	require.NoError(t, err)
	assert.False(t, hasChanges)
}

func TestHasChangesWithImport(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	scriptContent := `#!/bin/sh
if [ "$1" = "preview" ] && [ "$2" = "--json" ]; then
  echo '{"changeSummary":{"import":1}}'
  exit 0
fi
echo "unexpected command: $*" >&2
exit 1
`
	require.NoError(t, os.WriteFile(script, []byte(scriptContent), 0o755))

	oldPath := os.Getenv("PATH")
	t.Cleanup(func() { _ = os.Setenv("PATH", oldPath) })
	require.NoError(t, os.Setenv("PATH", tmpDir+":"+oldPath))

	tool := (&Pulumi{dir: tmpDir, stackName: "dev"}).init().(*Pulumi)
	hasChanges, err := tool.HasChanges()
	require.NoError(t, err)
	assert.True(t, hasChanges)
}

func TestOutputRedactsSecrets(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	scriptContent := `#!/bin/sh
if [ "$1" = "stack" ] && [ "$2" = "output" ]; then
  echo '{"public":"visible","secret":"sensitive-value"}'
  exit 0
fi
if [ "$1" = "stack" ] && [ "$2" = "export" ]; then
  if [ "$PULUMI_TEST_ENV" != "available" ]; then
    echo "missing stack environment" >&2
    exit 1
  fi
  echo '{"deployment":{"resources":[{"type":"pulumi:pulumi:Stack","additionalSecretOutputs":["secret"]}]}}'
  exit 0
fi
echo "unexpected command: $*" >&2
exit 1
`
	require.NoError(t, os.WriteFile(script, []byte(scriptContent), 0o755))

	oldPath := os.Getenv("PATH")
	t.Cleanup(func() { _ = os.Setenv("PATH", oldPath) })
	require.NoError(t, os.Setenv("PATH", tmpDir+":"+oldPath))

	outputs, err := (&Pulumi{
		dir:       tmpDir,
		stackName: "dev",
		env:       []string{"PULUMI_TEST_ENV=available"},
	}).init().(*Pulumi).Output()
	require.NoError(t, err)

	byName := make(map[string]string)
	secrets := make(map[string]bool)
	for _, output := range outputs {
		byName[output.Name] = output.Value
		secrets[output.Name] = output.Secret != nil && *output.Secret
	}

	assert.Equal(t, "visible", byName["public"])
	assert.False(t, secrets["public"])
	assert.Equal(t, "[secret]", byName["secret"])
	assert.True(t, secrets["secret"])
}

func TestPulumiConfigValue(t *testing.T) {
	value, valueType := pulumiConfigValue(true)
	assert.Equal(t, "true", value)
	assert.Equal(t, "bool", valueType)

	value, valueType = pulumiConfigValue(float64(2))
	assert.Equal(t, "2", value)
	assert.Equal(t, "int", valueType)

	value, valueType = pulumiConfigValue(map[string]any{"region": "us-east-1"})
	assert.Equal(t, `{"region":"us-east-1"}`, value)
	assert.Equal(t, "string", valueType)
}

func TestPrepareUsesConfiguredBackendAndEnvironment(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	logFile := filepath.Join(tmpDir, "commands")
	scriptContent := `#!/bin/sh
printf '%s|%s\n' "$PULUMI_TEST_ENV" "$*" >> "$PULUMI_COMMAND_LOG"
`
	require.NoError(t, os.WriteFile(script, []byte(scriptContent), 0o755))

	oldPath := os.Getenv("PATH")
	t.Cleanup(func() { _ = os.Setenv("PATH", oldPath) })
	require.NoError(t, os.Setenv("PATH", tmpDir+":"+oldPath))

	tool := (&Pulumi{
		dir:        tmpDir,
		stackName:  "dev",
		backendURL: "s3://pulumi-state",
		env: []string{
			"PULUMI_HOME=" + filepath.Join(tmpDir, ".pulumi"),
			"PULUMI_TEST_ENV=available",
			"PULUMI_COMMAND_LOG=" + logFile,
		},
	}).init().(*Pulumi)
	require.NoError(t, tool.Prepare())

	commands, err := os.ReadFile(logFile)
	require.NoError(t, err)
	assert.Contains(t, string(commands), "available|login s3://pulumi-state --non-interactive")
	assert.Contains(t, string(commands), "available|stack select dev --create --non-interactive")
}

func TestPulumiEnvPreservesCustomHome(t *testing.T) {
	env := pulumiEnv([]string{"PULUMI_HOME=/custom/pulumi"})
	assert.Equal(t, []string{"PULUMI_HOME=/custom/pulumi"}, env)

	env = pulumiEnv(nil)
	assert.Equal(t, []string{"PULUMI_HOME=" + defaultPulumiHome}, env)
}

func TestNewWithNilRun(t *testing.T) {
	tmpDir := t.TempDir()

	tool := New(v1.Config{
		ExecDir: tmpDir,
	}).(*Pulumi)

	assert.Equal(t, defaultStackName, tool.stackName)
	assert.Equal(t, defaultBackendURL, tool.backendURL)
	assert.Contains(t, tool.env, "PULUMI_HOME="+defaultPulumiHome)
	assert.Nil(t, tool.parallel)
	assert.Nil(t, tool.refresh)
	assert.False(t, tool.destroy)
}
