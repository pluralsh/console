package v1alpha1

import (
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&GeneratedSecret{}, &GeneratedSecretList{})
}

// +kubebuilder:object:root=true

// GeneratedSecretList contains a list of GeneratedSecret resources.
type GeneratedSecretList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GeneratedSecret `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced

// GeneratedSecret handles templated secret creation and distribution.
// It allows you to define secret templates with variable substitution and automatically distribute
// the rendered secrets to multiple namespaces and destinations. This is particularly useful for
// sharing configuration, credentials, or certificates across multiple applications or environments
// while maintaining consistency and reducing manual secret management overhead.
type GeneratedSecret struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GeneratedSecretSpec   `json:"spec,omitempty"`
	Status GeneratedSecretStatus `json:"status,omitempty"`
}

// SetCondition sets a condition on the GeneratedSecret status.
func (in *GeneratedSecret) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// GetSecretName returns the name of the rendered template secret for this GeneratedSecret.
// The name follows the pattern "gs-{name}" where {name} is the GeneratedSecret's name.
func (in *GeneratedSecret) GetSecretName() string {
	return fmt.Sprintf("gs-%s", in.Name)
}

// GeneratedSecretSpec defines the desired state of GeneratedSecret.
type GeneratedSecretSpec struct {
	// Template defines the secret data as key-value pairs in string form.
	// +kubebuilder:validation:Optional
	Template map[string]string `json:"template,omitempty"`

	// Destinations describe the target name and namespace for the generated secrets.
	// +kubebuilder:validation:Optional
	Destinations []GeneratedSecretDestination `json:"destinations,omitempty"`

	// ConfigurationRef references a Secret containing configuration data used to populate template variables.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// GeneratedSecretDestination defines a target location where the generated secret should be created.
type GeneratedSecretDestination struct {
	// Name specifies the name of the secret to create at the destination.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace specifies the namespace where the secret should be created.
	// If omitted, defaults to the same namespace as the GeneratedSecret resource.
	// +kubebuilder:validation:Optional
	Namespace string `json:"namespace,omitempty"`
}

// GeneratedSecretStatus defines the observed state of GeneratedSecret.
type GeneratedSecretStatus struct {
	// Status contains the common status fields including conditions.
	Status `json:",inline"`

	// RenderedTemplateSecretRef references the secret containing the final rendered template data.
	// +kubebuilder:validation:Optional
	RenderedTemplateSecretRef *corev1.LocalObjectReference `json:"renderedTemplateSecretRef,omitempty"`
}
