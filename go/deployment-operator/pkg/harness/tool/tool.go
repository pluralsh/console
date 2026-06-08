package tool

import (
	console "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/ansible"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/terraform"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/terragrunt"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

// New creates a specific tool implementation structure based on the provided
// gqlclient.StackType.
func New(stackType console.StackType, config v1.Config) v1.Tool {
	var t v1.Tool
	switch stackType {
	case console.StackTypeTerraform:
		t = terraform.New(config)
	case console.StackTypeTerragrunt:
		t = terragrunt.New(config)
	case console.StackTypeAnsible:
		t = ansible.New(config)
	case console.StackTypeCustom:
		t = v1.New()
	default:
		klog.Fatalf("unsupported stack type: %s", stackType)
	}

	return t
}
