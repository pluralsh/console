package v1alpha1

import (
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GeneratedSecretSpec defines the desired state of GeneratedSecret
type GeneratedSecretSpec struct {
	// Template secret data in string form.
	// +kubebuilder:validation:Optional
	Template map[string]string `json:"template,omitempty"`
	// Destinations describe name/namespace for the secrets.
	Destinations []GeneratedSecretDestination `json:"destinations,omitempty"`

	// ConfigurationRef is a secret reference which should contain data for secrets.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`
}

type GeneratedSecretDestination struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

type GeneratedSecretStatus struct {
	Status                    `json:",inline"`
	RenderedTemplateSecretRef *corev1.LocalObjectReference `json:"renderedTemplateSecretRef,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// GeneratedSecret is the Schema for the generatedsecrets API
type GeneratedSecret struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GeneratedSecretSpec   `json:"spec,omitempty"`
	Status GeneratedSecretStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// GeneratedSecretList contains a list of GeneratedSecret
type GeneratedSecretList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GeneratedSecret `json:"items"`
}

func (in *GeneratedSecret) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *GeneratedSecret) GetSecretName() string {
	return fmt.Sprintf("gs-%s", in.Name)
}

func init() {
	SchemeBuilder.Register(&GeneratedSecret{}, &GeneratedSecretList{})
}
