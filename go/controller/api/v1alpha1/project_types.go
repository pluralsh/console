package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Project{}, &ProjectList{})
}

// +kubebuilder:object:root=true

// ProjectList contains a list of Project resources.
type ProjectList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Project `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Project in the Console API."
// +kubebuilder:printcolumn:name="READONLY",type="boolean",JSONPath=".status.readonly",description="Flag indicating if the object is read-only"

// Project provides organizational segmentation and multi-tenancy capabilities within Plural Console.
// It serves as a unit of an organization to control permissions for sets of resources, enabling enterprise-grade
// fleet management while maintaining security boundaries. Projects allow resource owners to manage their
// domain without accessing resources outside their scope, supporting principles of least privilege
// and preventing credential sprawl across the entire fleet.
type Project struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API project spec.
	// +kubebuilder:validation:Required
	Spec ProjectSpec `json:"spec"`

	// Status represents the status of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID implements [PluralResource] interface
func (in *Project) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface
func (in *Project) ConsoleName() string {
	return in.Spec.Name
}

func (in *Project) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *Project) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ProjectSpec defines the desired state of a Project.
type ProjectSpec struct {
	// Name of the project.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myprojectname
	Name string `json:"name"`

	// Description provides a human-readable explanation of this project's purpose
	// and the resources it manages within the organizational hierarchy.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=my project description
	Description *string `json:"description,omitempty"`

	// Bindings contain read and write policies that control access to all resources
	// within this project, enabling fine-grained permission management and multi-tenancy.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
