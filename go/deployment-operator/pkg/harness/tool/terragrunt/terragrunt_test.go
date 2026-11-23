package terragrunt

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	tfjson "github.com/hashicorp/terraform-json"
	stackrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const mockTerragruntOutputEnv = "MOCK_TERRAGRUNT_OUTPUT"

func setupMockTerragrunt(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "terragrunt")
	content := "#!/bin/sh\necho \"$" + mockTerragruntOutputEnv + "\""

	err := os.WriteFile(script, []byte(content), 0755)
	if err != nil {
		t.Fatal(err)
	}

	path := os.Getenv("PATH")
	t.Setenv("PATH", tmpDir+string(os.PathListSeparator)+path)
}

func TestHasChanges(t *testing.T) {
	setupMockTerragrunt(t)

	plan := &tfjson.Plan{
		FormatVersion:   "1.0",
		ResourceChanges: []*tfjson.ResourceChange{},
		OutputChanges:   map[string]*tfjson.Change{},
	}
	output, _ := json.Marshal(plan)
	t.Setenv(mockTerragruntOutputEnv, string(output))

	tool := New(toolv1.Config{ExecDir: t.TempDir(), Run: &stackrunv1.StackRun{}})
	hasChanges, err := tool.HasChanges()

	assert.NoError(t, err)
	assert.False(t, hasChanges)
}

func TestInitDoesNotCreateEmptyPlanFile(t *testing.T) {
	dir := t.TempDir()
	_ = New(toolv1.Config{ExecDir: dir, Run: &stackrunv1.StackRun{}})

	_, err := os.Stat(filepath.Join(dir, "terraform.tfplan"))
	assert.True(t, os.IsNotExist(err))
}

func TestHasChangesRunAll(t *testing.T) {
	t.Run("no-op units", func(t *testing.T) {
		jsonDir := t.TempDir()
		writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)
		writePlan(t, filepath.Join(jsonDir, "app", planJSONBase), false)

		tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
		hasChanges, err := tool.HasChanges()

		assert.NoError(t, err)
		assert.False(t, hasChanges)
	})

	t.Run("one unit changed", func(t *testing.T) {
		jsonDir := t.TempDir()
		writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)
		writePlan(t, filepath.Join(jsonDir, "app", planJSONBase), true)

		tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
		hasChanges, err := tool.HasChanges()

		assert.NoError(t, err)
		assert.True(t, hasChanges)
	})

	t.Run("unreadable plan", func(t *testing.T) {
		jsonDir := t.TempDir()
		path := filepath.Join(jsonDir, "app", planJSONBase)
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
		require.NoError(t, os.WriteFile(path, []byte("{"), 0o644))

		tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
		_, err := tool.HasChanges()

		assert.Error(t, err)
	})
}

func TestRunAllWritesVariablesToUnits(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "network", "terragrunt.hcl"), "")
	writeFile(t, filepath.Join(dir, "nested", "storage", "terragrunt.hcl"), "")
	writeFile(t, filepath.Join(dir, "network", ".terragrunt-cache", "mod", "terragrunt.hcl"), "")

	vars := `{"name":"demo"}`
	New(toolv1.Config{
		ExecDir:   dir,
		Variables: &vars,
		Run:       &stackrunv1.StackRun{RunAll: true},
	})

	assert.Equal(t, vars, readFile(t, filepath.Join(dir, "network", "plural.auto.tfvars.json")))
	assert.Equal(t, vars, readFile(t, filepath.Join(dir, "nested", "storage", "plural.auto.tfvars.json")))
	_, err := os.Stat(filepath.Join(dir, "plural.auto.tfvars.json"))
	assert.True(t, os.IsNotExist(err))
	_, err = os.Stat(filepath.Join(dir, "network", ".terragrunt-cache", "mod", "plural.auto.tfvars.json"))
	assert.True(t, os.IsNotExist(err))
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, []byte(content), 0o644))
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	require.NoError(t, err)
	return string(raw)
}
