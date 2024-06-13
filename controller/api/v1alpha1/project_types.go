package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/polly/algorithms"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Project{}, &ProjectList{})
}

// ProjectList is a list of [Project].
// +kubebuilder:object:root=true
type ProjectList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Project `json:"items"`
}

// Project is a unit of organization to control
// permissions for a set of objects within your
// Console instance.
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Project in the Console API."
type Project struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API project spec.
	// +kubebuilder:validation:Required
	Spec ProjectSpec `json:"spec"`

	// Status represent a status of this resource.
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

func (in *Project) Attributes() console.ProjectAttributes {
	attrs := console.ProjectAttributes{
		Name:        in.ConsoleName(),
		Description: in.Spec.Description,
	}

	if in.Spec.Bindings != nil {
		attrs.ReadBindings = algorithms.Map(in.Spec.Bindings.Read,
			func(b Binding) *console.PolicyBindingAttributes { return b.Attributes() })
		attrs.WriteBindings = algorithms.Map(in.Spec.Bindings.Write,
			func(b Binding) *console.PolicyBindingAttributes { return b.Attributes() })
	}

	return attrs
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

type ProjectSpec struct {
	// Name is a project name.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=myprojectname
	Name string `json:"name"`

	// Description is a description of this project.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=my project description
	Description *string `json:"description,omitempty"`

	// Bindings contain read and write policies of this project.
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`
}
