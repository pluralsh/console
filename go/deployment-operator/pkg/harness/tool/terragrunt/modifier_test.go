package terragrunt

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	tfjson "github.com/hashicorp/terraform-json"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlanArgsSingleUnit(t *testing.T) {
	modifier := &PlanArgsModifier{planFileName: "terraform.tfplan"}

	assert.Equal(t, []string{"plan", "-out=terraform.tfplan"}, modifier.Args([]string{"plan"}))
}

func TestPlanArgsRunAll(t *testing.T) {
	parallelism := int64(4)
	refresh := false
	modifier := &PlanArgsModifier{
		planFileName: "terraform.tfplan",
		runAll:       true,
		outDir:       "/tmp/plans",
		jsonOutDir:   "/tmp/json",
		parallelism:  &parallelism,
		refresh:      &refresh,
	}

	args := modifier.Args([]string{"run", "--all", "--non-interactive", "--queue-exclude-external", "plan", "-destroy"})

	assert.Equal(t, []string{
		"run", "--all", "--non-interactive", "--queue-exclude-external",
		"--out-dir", "/tmp/plans",
		"--json-out-dir", "/tmp/json",
		"--", "plan", "-destroy",
		"-parallelism=4",
		"-refresh=false",
	}, args)
	assert.NotContains(t, args, "-out=terraform.tfplan")
}

func TestApplyArgsRunAllDefersFilters(t *testing.T) {
	jsonDir := t.TempDir()
	writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)
	writePlan(t, filepath.Join(jsonDir, "nested", "storage", planJSONBase), true)

	modifier := &ApplyArgsModifier{runAll: true, outDir: "/tmp/plans", jsonOutDir: jsonDir}
	args := modifier.Args([]string{"run", "--all", "--non-interactive", "--queue-exclude-external", "apply"})

	assert.Equal(t, []string{
		"run", "--all", "--non-interactive", "--queue-exclude-external",
		"--out-dir", "/tmp/plans",
		"apply",
	}, args)
	assert.NotContains(t, args, "--filter")
}

func TestApplyArgsSelectsChangedUnits(t *testing.T) {
	jsonDir := t.TempDir()
	writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)
	writePlan(t, filepath.Join(jsonDir, "nested", "storage", planJSONBase), true)

	tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
	args, err := tool.ApplyArgs([]string{"run", "--all", "--non-interactive", "--queue-exclude-external", "--out-dir", "/tmp/plans", "apply"})

	require.NoError(t, err)
	assert.Equal(t, []string{
		"run", "--all", "--non-interactive", "--queue-exclude-external",
		"--out-dir", "/tmp/plans",
		"--filter", "./nested/storage",
		"--", "apply",
	}, args)
}

func TestApplyArgsErrorsWithoutChangedUnits(t *testing.T) {
	jsonDir := t.TempDir()
	writePlan(t, filepath.Join(jsonDir, "network", planJSONBase), false)

	tool := &Terragrunt{runAll: true, jsonOutDir: jsonDir}
	_, err := tool.ApplyArgs([]string{"apply"})

	assert.Error(t, err)
}

func TestApplyArgsErrorsWhenPlansMissing(t *testing.T) {
	tool := &Terragrunt{runAll: true, jsonOutDir: filepath.Join(t.TempDir(), "missing")}
	_, err := tool.ApplyArgs([]string{"apply"})

	assert.Error(t, err)
}

func writePlan(t *testing.T, path string, changed bool) {
	t.Helper()

	plan := &tfjson.Plan{
		FormatVersion:   "1.0",
		ResourceChanges: []*tfjson.ResourceChange{},
		OutputChanges:   map[string]*tfjson.Change{},
	}
	if changed {
		plan.ResourceChanges = []*tfjson.ResourceChange{{
			Address: "local_file.demo",
			Change: &tfjson.Change{
				Actions: tfjson.Actions{tfjson.ActionCreate},
			},
		}}
	}

	raw, err := json.Marshal(plan)
	require.NoError(t, err)
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, raw, 0o644))
}
