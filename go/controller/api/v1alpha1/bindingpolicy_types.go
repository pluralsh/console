package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&BindingPolicy{}, &BindingPolicyList{})
}

//+kubebuilder:object:root=true

// BindingPolicyList contains a list of BindingPolicy resources.
type BindingPolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []BindingPolicy `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the BindingPolicy in the Console API."

// BindingPolicy automatically attaches a Policy to all resources that match
// the configured criteria. It references two Policy CRDs: policyRef (the policy
// to enforce) and bindPolicyRef (the selector policy that determines which
// resources are targeted). The controller polls at the configured interval and
// applies the policy to any newly matching targets.
type BindingPolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API binding policy spec.
	// +kubebuilder:validation:Required
	Spec BindingPolicySpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID implements [PluralResource] interface.
func (in *BindingPolicy) ConsoleID() *string {
	return in.Status.ID
}

func (in *BindingPolicy) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *BindingPolicy) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// BindingPolicySpec defines the desired state of a BindingPolicy.
type BindingPolicySpec struct {
	// Type specifies the resource type this binding policy applies to.
	// Valid values: WORKBENCH, STACK.
	// +kubebuilder:validation:Required
	Type console.BindingPolicyType `json:"type"`

	// Interval controls how often this binding policy is evaluated.
	// Defaults to 1h; cannot be shorter than 30m. Format: duration string e.g. "1h", "30m".
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`

	// PolicyRef references the Policy CRD whose policy will be enforced on matching targets.
	// +kubebuilder:validation:Required
	PolicyRef corev1.ObjectReference `json:"policyRef"`

	// BindPolicyRef references the Policy CRD whose policy determines which targets to bind.
	// +kubebuilder:validation:Required
	BindPolicyRef corev1.ObjectReference `json:"bindPolicyRef"`

	// Matches defines criteria that determine when this binding policy applies.
	// +kubebuilder:validation:Optional
	Matches *BindingPolicyMatches `json:"matches,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// BindingPolicyMatches defines the criteria used to select targets for a BindingPolicy.
type BindingPolicyMatches struct {
	// Workbench defines match criteria for workbench-type binding policies.
	// +kubebuilder:validation:Optional
	Workbench *WorkbenchBindingPolicyMatches `json:"workbench,omitempty"`
}

// WorkbenchBindingPolicyMatches defines regex-based selection criteria for workbench targets.
type WorkbenchBindingPolicyMatches struct {
	// Regexes is a list of regular expressions that select workbench inputs for this policy.
	// +kubebuilder:validation:Optional
	Regexes []*string `json:"regexes,omitempty"`
}
