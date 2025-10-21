package v1alpha1

import (
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&StackDefinition{}, &StackDefinitionList{})
}

// +kubebuilder:object:root=true

// StackDefinitionList contains a list of StackDefinition resources.
type StackDefinitionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []StackDefinition `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the StackDefinition in the Console API."

// StackDefinition provides reusable templates for Infrastructure Stack configurations and execution steps.
// It allows you to define standardized stack configurations, custom execution steps, and runtime environments
// that can be referenced by multiple Infrastructure Stacks. This enables consistent deployment patterns
// and reduces duplication when managing similar infrastructure components across different environments.
type StackDefinition struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   StackDefinitionSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

func (in *StackDefinition) StackName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *StackDefinition) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *StackDefinition) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *StackDefinition) Attributes() console.StackDefinitionAttributes {
	result := console.StackDefinitionAttributes{
		Name:        in.StackName(),
		Description: in.Spec.Description,
		Steps: algorithms.Map(in.Spec.Steps, func(s CustomRunStep) *console.CustomStepAttributes {
			return &console.CustomStepAttributes{
				Stage:           &s.Stage,
				Cmd:             s.Cmd,
				Args:            lo.ToSlicePtr(s.Args),
				RequireApproval: s.RequireApproval,
			}
		}),
	}

	if in.Spec.Configuration != nil {
		result.Configuration = &console.StackConfigurationAttributes{
			Image:   in.Spec.Configuration.Image,
			Version: in.Spec.Configuration.Version,
			Tag:     in.Spec.Configuration.Tag,
			Hooks: algorithms.Map(in.Spec.Configuration.Hooks, func(h *StackHook) *console.StackHookAttributes {
				return &console.StackHookAttributes{
					Cmd:        h.Cmd,
					Args:       lo.ToSlicePtr(h.Args),
					AfterStage: h.AfterStage,
				}
			}),
		}
	}

	return result
}

// StackDefinitionSpec defines the desired state of the StackDefinition.
type StackDefinitionSpec struct {
	// Name of this StackDefinition.
	// If not provided, the name from StackDefinition.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a human-readable explanation of what this StackDefinition
	// template is intended for and how it should be used.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Steps defines a list of custom run steps that will be executed as part of
	// any stack run using this definition. Each step specifies a command, arguments,
	// execution stage, and approval requirements.
	// +kubebuilder:validation:Optional
	Steps []CustomRunStep `json:"steps,omitempty"`

	// Configuration allows customization of the stack execution environment,
	// including Docker image settings, version specifications, and execution hooks.
	// +kubebuilder:validation:Optional
	Configuration *StackConfiguration `json:"configuration,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// CustomRunStep defines a custom execution step within a StackDefinition template.
// Each step represents a discrete action that will be performed during stack execution,
// with control over when it runs and whether it requires manual approval.
type CustomRunStep struct {
	// Args provides additional command-line arguments that should be passed
	// to the command specified in Cmd during execution.
	// +kubebuilder:validation:Required
	Args []string `json:"args,omitempty"`

	// Cmd specifies the executable command that should be run as part of this
	// custom step. This can be any command available in the execution environment.
	// +kubebuilder:validation:Required
	Cmd string `json:"cmd"`

	// RequireApproval determines whether this step requires manual approval
	// before it can proceed. When true, the stack run will pause at this step
	// until an authorized user approves its execution.
	// +kubebuilder:validation:Optional
	RequireApproval *bool `json:"requireApproval,omitempty"`

	// Stage controls at which phase of the stack lifecycle this step should be executed.
	// Valid stages include PLAN, VERIFY, APPLY, INIT, and DESTROY, allowing fine-grained
	// control over when custom logic runs in relation to the main IaC operations.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=PLAN;VERIFY;APPLY;INIT;DESTROY
	Stage console.StepStage `json:"stage"`
}
