package terraform

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	tfjson "github.com/hashicorp/terraform-json"
	"github.com/stretchr/testify/assert"
)

const mockTerraformOutputEnv = "MOCK_TERRAFORM_OUTPUT"

// setupMockTerraform creates a mock terraform executable in a temporary directory
// and adds it to the PATH. The mock executable simply echoes the content of
// the MOCK_TERRAFORM_OUTPUT environment variable.
// This allows tests to control the output of "terraform show -json" by setting
// the environment variable.
func setupMockTerraform(t *testing.T) {
	tmpDir := t.TempDir()
	script := filepath.Join(tmpDir, "terraform")
	content := "#!/bin/sh\necho \"$" + mockTerraformOutputEnv + "\""

	err := os.WriteFile(script, []byte(content), 0755)
	if err != nil {
		t.Fatal(err)
	}

	path := os.Getenv("PATH")
	t.Setenv("PATH", tmpDir+string(os.PathListSeparator)+path)
}

func TestHasChanges(t *testing.T) {
	// Setup the mock terraform executable.
	// This will intercept calls to "terraform" and return controlled output.
	setupMockTerraform(t)

	tests := []struct {
		name           string
		plan           *tfjson.Plan
		expectedResult bool
		expectedError  error
	}{
		{
			name: "no changes",
			plan: &tfjson.Plan{
				FormatVersion:   "1.0",
				ResourceChanges: []*tfjson.ResourceChange{},
				OutputChanges:   map[string]*tfjson.Change{},
			},
			expectedResult: false,
		},
		{
			name: "deferred changes",
			plan: &tfjson.Plan{
				FormatVersion:   "1.0",
				DeferredChanges: []*tfjson.DeferredResourceChange{{}},
			},
			expectedResult: true,
		},
		{
			name: "resource changes",
			plan: &tfjson.Plan{
				FormatVersion: "1.0",
				ResourceChanges: []*tfjson.ResourceChange{
					{
						Change: &tfjson.Change{
							Actions: tfjson.Actions{tfjson.ActionCreate},
						},
					},
				},
			},
			expectedResult: true,
		},
		{
			name: "resource no-op",
			plan: &tfjson.Plan{
				FormatVersion: "1.0",
				ResourceChanges: []*tfjson.ResourceChange{
					{
						Change: &tfjson.Change{
							Actions: tfjson.Actions{tfjson.ActionNoop},
						},
					},
				},
			},
			expectedResult: false,
		},
		{
			name: "output changes",
			plan: &tfjson.Plan{
				FormatVersion: "1.0",
				OutputChanges: map[string]*tfjson.Change{
					"output": {
						Actions: tfjson.Actions{tfjson.ActionCreate},
					},
				},
			},
			expectedResult: true,
		},
		{
			name: "output no-op",
			plan: &tfjson.Plan{
				FormatVersion: "1.0",
				OutputChanges: map[string]*tfjson.Change{
					"output": {
						Actions: tfjson.Actions{tfjson.ActionNoop},
					},
				},
			},
			expectedResult: false,
		},
		{
			name: "resource drift",
			plan: &tfjson.Plan{
				FormatVersion: "1.0",
				ResourceDrift: []*tfjson.ResourceChange{{}},
			},
			expectedResult: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Serialize the test plan to JSON and set it as the mock output.
			// When HasChanges calls "terraform show -json", the mock script
			// will output this JSON.
			output, _ := json.Marshal(tt.plan)
			t.Setenv(mockTerraformOutputEnv, string(output))

			tmpDir := t.TempDir()
			tf := &Terraform{
				dir:          tmpDir,
				planFileName: "terraform.tfplan",
			}

			hasChanges, err := tf.HasChanges()
			if tt.expectedError != nil {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedResult, hasChanges)
			}
		})
	}
}
