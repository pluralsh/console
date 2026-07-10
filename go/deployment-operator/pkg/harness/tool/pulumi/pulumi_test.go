package pulumi

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHasChanges(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "pulumi")
	previewOutput, err := json.Marshal(previewJSON{
		ChangeSummary: struct {
			Create  int `json:"create"`
			Update  int `json:"update"`
			Delete  int `json:"delete"`
			Replace int `json:"replace"`
			Same    int `json:"same"`
		}{
			Create: 1,
		},
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
		ChangeSummary: struct {
			Create  int `json:"create"`
			Update  int `json:"update"`
			Delete  int `json:"delete"`
			Replace int `json:"replace"`
			Same    int `json:"same"`
		}{
			Same: 3,
		},
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
