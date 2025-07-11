package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ServiceContextSpec defines the desired state of ServiceContext
type ServiceContextSpec struct {
	// the name of this service, if not provided ServiceContext's own name from ServiceContext.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// A reusable configuration context, useful for plumbing data from external tools like terraform, pulumi, etc.
	Configuration runtime.RawExtension `json:"configuration,omitempty"`

	// ProjectRef references project this service context belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *v1.ObjectReference `json:"projectRef,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"

// ServiceContext is the Schema for the servicecontexts API
type ServiceContext struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ServiceContextSpec `json:"spec,omitempty"`
	Status Status             `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ServiceContextList contains a list of ServiceContext
type ServiceContextList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ServiceContext `json:"items"`
}

func (s *ServiceContext) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

// ConsoleID implements NamespacedPluralResource interface
func (s *ServiceContext) ConsoleID() *string {
	return s.Status.ID
}

func (s *ServiceContext) ConsoleName() string {
	if s.Spec.Name != nil && len(*s.Spec.Name) > 0 {
		return *s.Spec.Name
	}

	return s.Name
}

func (p *ServiceContext) ProjectName() string {
	if p.Spec.ProjectRef == nil {
		return ""
	}

	return p.Spec.ProjectRef.Name
}

func (p *ServiceContext) HasProjectRef() bool {
	return p.Spec.ProjectRef != nil
}

func (s *ServiceContext) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(s.Spec)
	if err != nil {
		return false, "", err
	}

	return !s.Status.IsSHAEqual(currentSha), currentSha, nil
}

func init() {
	SchemeBuilder.Register(&ServiceContext{}, &ServiceContextList{})
}
