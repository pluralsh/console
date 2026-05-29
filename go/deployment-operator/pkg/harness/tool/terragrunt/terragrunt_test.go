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
