package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ServiceContextSpec defines the desired state of the ServiceContext.
type ServiceContextSpec struct {
	// Name of this service context.
	// If not provided, the name from ServiceContext.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Configuration is a reusable configuration context that can include any JSON-compatible configuration data
	// that needs to be shared across multiple services.
	Configuration runtime.RawExtension `json:"configuration,omitempty"`

	// ProjectRef references the project this service context belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *v1.ObjectReference `json:"projectRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID in the Console API."

// ServiceContext provides a reusable bundle of configuration. It enables sharing configuration data across multiple services.
// This is particularly useful for passing outputs from infrastructure-as-code tools to Kubernetes services.
type ServiceContext struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ServiceContextSpec `json:"spec,omitempty"`
	Status Status             `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// ServiceContextList contains a list of ServiceContext resources.
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
