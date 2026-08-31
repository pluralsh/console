package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&Policy{}, &PolicyList{})
}

//+kubebuilder:object:root=true

// PolicyList contains a list of Policy resources.
type PolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Policy `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Policy in the Console API."
// +kubebuilder:printcolumn:name="READONLY",type="boolean",JSONPath=".status.readonly",description="Flag indicating if the object is read-only"

// Policy defines a reusable OPA policy that can be attached to resources via BindingPolicy.
// Policies contain the actual policy source text (Rego) along with metadata describing
// what type of resources they apply to (workbench, stack, or binding).
type Policy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API policy spec.
	// +kubebuilder:validation:Required
	Spec PolicySpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the policy.
func (in *Policy) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *Policy) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *Policy) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

func (in *Policy) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *Policy) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// PolicySpec defines the desired state of a Policy.
type PolicySpec struct {
	// Name is the unique policy name in the Console API.
	// Defaults to metadata.name if not specified.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a human-readable explanation of this policy's purpose.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Type specifies what kind of resource this policy applies to.
	// Valid values: WORKBENCH, STACK, BINDING.
	// +kubebuilder:validation:Optional
	Type *console.PolicyType `json:"type,omitempty"`

	// Policy contains the actual policy source text (e.g. Rego for OPA policies).
	// +kubebuilder:validation:Optional
	Policy *string `json:"policy,omitempty"`

	// ProjectRef links this policy to a specific project.
	// When set, the policy is scoped to that project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
