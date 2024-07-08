package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&NamespaceCredentials{}, &NamespaceCredentialsList{})
}

// NamespaceCredentialsList contains a list of NamespaceCredentials.
// +kubebuilder:object:root=true
type NamespaceCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []NamespaceCredentials `json:"items"`
}

// NamespaceCredentials connects namespaces with credentials from secret ref,
// which are then used by other controllers during reconciling.
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
type NamespaceCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec NamespaceCredentialsSpec `json:"spec"`

	// +kubebuilder:validation:Optional
	Status NamespaceCredentialsStatus `json:"status,omitempty"`
}

func (in *NamespaceCredentials) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

type NamespaceCredentialsSpec struct {
	// Namespaces that will be connected with credentials from SecretRef.
	// +kubebuilder:validation:Required
	Namespaces []string `json:"namespaces"`

	// SecretRef contains reference to secret with credentials.
	// +kubebuilder:validation:Required
	SecretRef corev1.SecretReference `json:"secretRef,omitempty"`
}

type NamespaceCredentialsStatus struct {
	// TokenSHA contains SHA of last token seen.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	TokenSHA *string `json:"tokenSHA,omitempty"`

	// Conditions represent the observations of a NamespaceCredentials current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (p *NamespaceCredentialsStatus) IsStatusConditionTrue(condition ConditionType) bool {
	return meta.IsStatusConditionTrue(p.Conditions, condition.String())
}
