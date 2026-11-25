package terragrunt

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	tfjson "github.com/hashicorp/terraform-json"
	console "github.com/pluralsh/console/go/client"
	securityv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/security/v1"
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

func TestPlanAllRendersSavedJSON(t *testing.T) {
	jsonDir := t.TempDir()
	writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)
	writePlan(t, filepath.Join(jsonDir, "app", planJSONBase), true)

	tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
	state, err := tool.Plan()

	require.NoError(t, err)
	require.NotNil(t, state.Plan)
	assert.Contains(t, *state.Plan, "# app\n  # local_file.demo will be created\nPlan: 1 to add, 0 to change, 0 to destroy.")
	assert.Contains(t, *state.Plan, "# network\nNo changes.")
	require.NotNil(t, state.PlanJSON)

	var doc struct {
		ResourceChanges []struct {
			Address string `json:"address"`
		} `json:"resource_changes"`
	}
	require.NoError(t, json.Unmarshal([]byte(*state.PlanJSON), &doc))
	require.Len(t, doc.ResourceChanges, 1)
	assert.Equal(t, "app.local_file.demo", doc.ResourceChanges[0].Address)
}

func TestCombinedPlanJSONPrefixesUnitAddresses(t *testing.T) {
	raw, err := combinedPlanJSON([]unitPlan{
		{rel: ".", plan: &tfjson.Plan{
			TerraformVersion: "1.8.2",
			ResourceChanges: []*tfjson.ResourceChange{{
				Address: "local_file.root",
				Type:    "local_file",
				Name:    "root",
			}},
		}},
		{rel: "nested/storage", plan: &tfjson.Plan{
			ResourceChanges: []*tfjson.ResourceChange{{
				Address:      "local_file.storage",
				Type:         "local_file",
				Name:         "storage",
				ProviderName: "registry.terraform.io/hashicorp/local",
				Change: &tfjson.Change{
					Actions: tfjson.Actions{tfjson.ActionCreate},
				},
			}},
		}},
	})

	require.NoError(t, err)

	var doc struct {
		TerraformVersion string `json:"terraform_version"`
		ResourceChanges  []struct {
			Address      string `json:"address"`
			Type         string `json:"type"`
			Name         string `json:"name"`
			ProviderName string `json:"provider_name"`
			Change       struct {
				Actions []string `json:"actions"`
			} `json:"change"`
		} `json:"resource_changes"`
	}
	require.NoError(t, json.Unmarshal([]byte(raw), &doc))
	assert.Equal(t, "1.8.2", doc.TerraformVersion)
	require.Len(t, doc.ResourceChanges, 2)
	assert.Equal(t, "local_file.root", doc.ResourceChanges[0].Address)
	assert.Equal(t, "nested/storage.local_file.storage", doc.ResourceChanges[1].Address)
	assert.Equal(t, "local_file", doc.ResourceChanges[1].Type)
	assert.Equal(t, "storage", doc.ResourceChanges[1].Name)
	assert.Equal(t, "registry.terraform.io/hashicorp/local", doc.ResourceChanges[1].ProviderName)
	assert.Equal(t, []string{"create"}, doc.ResourceChanges[1].Change.Actions)
}

func TestScanAllUsesEachUnitPlan(t *testing.T) {
	parent := t.TempDir()
	jsonDir := t.TempDir()
	writeFile(t, filepath.Join(jsonDir, "network", planJSONBase), "{}")
	writeFile(t, filepath.Join(jsonDir, "nested", "storage", planJSONBase), "{}")

	scanner := &fakeScanner{}
	tool := &Terragrunt{
		DefaultTool:       toolv1.DefaultTool{Scanner: scanner},
		runAll:            true,
		dir:               parent,
		workDir:           parent,
		jsonOutDir:        jsonDir,
		variablesFileName: "plural.auto.tfvars.json",
	}

	violations, err := tool.Scan()

	require.NoError(t, err)
	require.Len(t, scanner.calls, 2)
	assert.Equal(t, filepath.Join(parent, "nested", "storage"), scanner.calls[0].Dir)
	assert.Equal(t, filepath.Join(jsonDir, "nested", "storage", planJSONBase), scanner.calls[0].PlanFileName)
	assert.Equal(t, filepath.Join(parent, "network"), scanner.calls[1].Dir)
	assert.Equal(t, "plural.auto.tfvars.json", scanner.calls[1].VariablesFileName)
	assert.Len(t, violations, 2)
}

func TestScanAllReturnsScanError(t *testing.T) {
	parent := t.TempDir()
	jsonDir := t.TempDir()
	writeFile(t, filepath.Join(jsonDir, "network", planJSONBase), "{}")

	tool := &Terragrunt{
		DefaultTool: toolv1.DefaultTool{Scanner: &fakeScanner{err: fmt.Errorf("trivy failed")}},
		runAll:      true,
		dir:         parent,
		jsonOutDir:  jsonDir,
	}

	_, err := tool.Scan()

	assert.Error(t, err)
}

type fakeScanner struct {
	calls []securityv1.TerraformScanOptions
	err   error
}

func (f *fakeScanner) Scan(_ console.StackType, options ...securityv1.ScanOption) ([]*console.StackPolicyViolationAttributes, error) {
	opts := &securityv1.ScanOptions{}
	for _, option := range options {
		option(opts)
	}
	f.calls = append(f.calls, opts.Terraform)
	if f.err != nil {
		return nil, f.err
	}

	return []*console.StackPolicyViolationAttributes{{Title: opts.Terraform.Dir}}, nil
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
