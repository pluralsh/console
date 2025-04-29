package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PreviewEnvironmentTemplateSpec defines the desired state of PreviewEnvironmentTemplate
type PreviewEnvironmentTemplateSpec struct {
	// Name, if not provided name from object meta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// CommentTemplate liquid template for custom information.
	// +kubebuilder:validation:Optional
	CommentTemplate *string `json:"commentTemplate,omitempty"`

	// ScmConnectionRef the SCM connection.
	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// ReferenceServiceRef specifies a reference to a Service Deployment object associated with the environment template.
	// +kubebuilder:validation:Required
	ReferenceServiceRef corev1.ObjectReference `json:"referenceServiceRef"`

	// reference to a Flow this pipeline belongs within
	// +kubebuilder:validation:Required
	FlowRef corev1.ObjectReference `json:"flowRef"`

	// Template set of service configuration overrides to use while cloning
	// +kubebuilder:validation:Required
	Template ServiceTemplate `json:"template"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PreviewEnvironmentTemplate is the Schema for the previewenvironmenttemplates API
type PreviewEnvironmentTemplate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PreviewEnvironmentTemplateSpec `json:"spec,omitempty"`
	Status Status                         `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PreviewEnvironmentTemplateList contains a list of PreviewEnvironmentTemplate
type PreviewEnvironmentTemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PreviewEnvironmentTemplate `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PreviewEnvironmentTemplate{}, &PreviewEnvironmentTemplateList{})
}

func (in *PreviewEnvironmentTemplate) GetName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *PreviewEnvironmentTemplate) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
