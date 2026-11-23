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

func TestPlanAllShowsFromUnitDirectory(t *testing.T) {
	parent := t.TempDir()
	outDir := t.TempDir()
	logFile := filepath.Join(t.TempDir(), "show.log")
	unit := filepath.Join(parent, "nested", "storage")
	require.NoError(t, os.MkdirAll(unit, 0o755))

	planPath := filepath.Join(outDir, "nested", "storage", planFileBase)
	writeFile(t, planPath, "binary-plan")
	installTerragruntShow(t, logFile)

	tool := &Terragrunt{runAll: true, dir: parent, outDir: outDir}
	state, err := tool.Plan()

	require.NoError(t, err)
	require.NotNil(t, state.Plan)
	assert.Contains(t, *state.Plan, "# nested/storage")
	assert.Contains(t, *state.Plan, "shown plan")

	log := readFile(t, logFile)
	assert.Contains(t, log, unit)
	assert.Contains(t, log, planPath)
	assert.NotContains(t, log, parent+"\n")
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

func installTerragruntShow(t *testing.T, logFile string) {
	t.Helper()

	bin := t.TempDir()
	script := fmt.Sprintf("#!/bin/sh\npwd >> %q\nprintf '%%s\\n' \"$*\" >> %q\nprintf 'shown plan\\n'\n", logFile, logFile)
	require.NoError(t, os.WriteFile(filepath.Join(bin, "terragrunt"), []byte(script), 0o755))
	t.Setenv("PATH", bin+string(os.PathListSeparator)+os.Getenv("PATH"))
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
