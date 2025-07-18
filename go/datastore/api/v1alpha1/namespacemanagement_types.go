package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NamespaceManagementSpec defines the desired state of NamespaceManagement.
type NamespaceManagementSpec struct {
	// The interval at which you'll reconcile namespaces according to this spec
	Interval string `json:"interval"`
	// A resource to use to verify if the namespace should be pruned, if it exists, the namespace will be ignored
	Sentinel Sentinel `json:"sentinel"`
	// A regex to use to match namespaces to prune
	NamespacePattern string `json:"namespacePattern"`
}

type Sentinel struct {
	Kind string `json:"kind"`
	// +optional
	Namespace *string `json:"namespace,omitempty"`

	Name string `json:"name"`

	APIVersion string `json:"apiVersion"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// NamespaceManagement defines prune rules for namespaces in a cluster, if the declared sentinel resource no longer exists, the namespaces will be pruned according to the spec.
type NamespaceManagement struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   NamespaceManagementSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// NamespaceManagementList contains a list of NamespaceManagement.
type NamespaceManagementList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NamespaceManagement `json:"items"`
}

func (p *NamespaceManagement) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&NamespaceManagement{}, &NamespaceManagementList{})
}
