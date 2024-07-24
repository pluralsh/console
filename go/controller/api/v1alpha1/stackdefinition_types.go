package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&StackDefinition{}, &StackDefinitionList{})
}

// StackDefinitionList contains a list of StackDefinition
// +kubebuilder:object:root=true
type StackDefinitionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []StackDefinition `json:"items"`
}

// StackDefinition is the Schema for the StackDefinitions API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the StackDefinition in the Console API."
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
	return console.StackDefinitionAttributes{
		Name:        in.StackName(),
		Description: in.Spec.Description,
		Configuration: &console.StackConfigurationAttributes{
			Image:   in.Spec.Configuration.Image,
			Version: &in.Spec.Configuration.Version,
			Tag:     in.Spec.Configuration.Tag,
			Hooks: algorithms.Map(in.Spec.Configuration.Hooks, func(h *StackHook) *console.StackHookAttributes {
				return &console.StackHookAttributes{
					Cmd:        h.Cmd,
					Args:       lo.ToSlicePtr(h.Args),
					AfterStage: h.AfterStage,
				}
			}),
		},
		Steps: algorithms.Map(in.Spec.Steps, func(s CustomRunStep) *console.CustomStepAttributes {
			return &console.CustomStepAttributes{
				Stage:           &s.Stage,
				Cmd:             s.Cmd,
				Args:            lo.ToSlicePtr(s.Args),
				RequireApproval: s.RequireApproval,
			}
		}),
	}
}

// StackDefinitionSpec defines the desired state of StackDefinition
type StackDefinitionSpec struct {
	// Name of this StackDefinition. If not provided StackDefinition's own name
	// from StackDefinition.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description can be used to describe this StackDefinition.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Steps is a list of custom run steps that will be executed as
	// part of the stack run.
	// +kubebuilder:validation:Optional
	Steps []CustomRunStep `json:"steps,omitempty"`

	// Configuration allows modifying the StackDefinition environment
	// and execution.
	// +kubebuilder:validation:Required
	Configuration StackConfiguration `json:"configuration"`
}

type CustomRunStep struct {
	// Args allow you to provide any additional
	// args that should be passed to the custom
	// run step.
	// +kubebuilder:validation:Required
	Args []string `json:"args,omitempty"`

	// Cmd defines what command should be executed
	// as part of your custom run step.
	// +kubebuilder:validation:Required
	Cmd string `json:"cmd"`

	// RequireApproval controls whether this custom run step
	// will require an approval to proceed.
	// +kubebuilder:validation:Optional
	RequireApproval *bool `json:"requireApproval,omitempty"`

	// Stage controls at which stage should this custom run
	// step be executed.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=PLAN;VERIFY;APPLY;INIT;DESTROY
	Stage console.StepStage `json:"stage"`
}
