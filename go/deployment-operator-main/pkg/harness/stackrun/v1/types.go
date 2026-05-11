package v1

import (
	"encoding/json"
	"fmt"

	gqlclient "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
	"github.com/samber/lo"
)

type StackRun struct {
	ID      string
	Tarball string

	ExecWorkDir *string
	ApprovedAt  *string

	Approval    bool
	ManageState bool
	DryRun      bool

	Variables map[string]interface{}

	Status       gqlclient.StackStatus
	Type         gqlclient.StackType
	Creds        *gqlclient.StackRunBaseFragment_PluralCreds
	StateUrls    *gqlclient.StackRunBaseFragment_StateUrls
	PolicyEngine *gqlclient.PolicyEngineFragment

	Steps       []*gqlclient.RunStepFragment
	Files       []*gqlclient.StackFileFragment
	Environment []*gqlclient.StackEnvironmentFragment

	Parallelism  *int64
	Refresh      *bool
	ApproveEmpty *bool

	InventoryFile *string
	PlaybookFile  *string
	SSHKeyFile    *string
	ConfigFile    *string

	ConsoleURL   string
	ConsoleToken string
}

func (in *StackRun) MaxSeverity() int {
	if in.PolicyEngine == nil || in.PolicyEngine.MaxSeverity == nil {
		return -1
	}

	return v1.SeverityInt(*in.PolicyEngine.MaxSeverity)
}

func (in *StackRun) FromStackRunBaseFragment(fragment *gqlclient.StackRunBaseFragment) *StackRun {
	run := &StackRun{
		ID:           fragment.ID,
		Status:       fragment.Status,
		Type:         fragment.Type,
		Tarball:      fragment.Tarball,
		Steps:        fragment.Steps,
		Files:        fragment.Files,
		Environment:  fragment.Environment,
		Approval:     fragment.Approval != nil && *fragment.Approval,
		ApprovedAt:   fragment.ApprovedAt,
		ExecWorkDir:  fragment.Workdir,
		ManageState:  fragment.ManageState != nil && *fragment.ManageState,
		Creds:        fragment.PluralCreds,
		StateUrls:    fragment.StateUrls,
		Variables:    fragment.Variables,
		PolicyEngine: fragment.PolicyEngine,
		DryRun:       fragment.DryRun,
	}

	if fragment.PluralCreds != nil {
		run.ConsoleURL = lo.FromPtr(fragment.PluralCreds.URL)
		run.ConsoleToken = lo.FromPtr(fragment.PluralCreds.Token)
	}

	if tf := fragment.Configuration.Terraform; tf != nil {
		run.Parallelism = tf.Parallelism
		run.Refresh = tf.Refresh
		run.ApproveEmpty = tf.ApproveEmpty
	}
	if ans := fragment.Configuration.Ansible; ans != nil {
		run.InventoryFile = ans.Inventory
		run.PlaybookFile = ans.Playbook
		run.SSHKeyFile = ans.PrivateKeyFile
		run.ConfigFile = ans.ConfigFile
	}

	return run
}

// Env parses the StackRun.Environment as a list of strings.
// Each entry is of the form "key=value". Automatically adds Plural env vars if creds were configured.
func (in *StackRun) Env() []string {
	env := make([]string, len(in.Environment))

	for i, e := range in.Environment {
		env[i] = fmt.Sprintf("%s=%s", e.Name, e.Value)
	}

	if in.Creds != nil {
		env = append(env, fmt.Sprintf("PLURAL_ACCESS_TOKEN=%s", lo.FromPtr(in.Creds.Token)))
		env = append(env, fmt.Sprintf("PLURAL_CONSOLE_URL=%s", lo.FromPtr(in.Creds.URL)))
	}

	return env
}

// Vars parses the StackRun.Variables map as a valid JSON.
func (in *StackRun) Vars() (*string, error) {
	if in.Variables == nil {
		return nil, nil
	}

	data, err := json.Marshal(in.Variables)
	return lo.ToPtr(string(data)), err
}

type Lifecycle string

const (
	LifecyclePreStart  Lifecycle = "pre-start"
	LifecyclePostStart Lifecycle = "post-start"
)

type HookFunction func() error
