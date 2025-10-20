package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&NamespaceCredentials{}, &NamespaceCredentialsList{})
}

// +kubebuilder:object:root=true

// NamespaceCredentialsList contains a list of NamespaceCredentials resources.
type NamespaceCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []NamespaceCredentials `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status

// NamespaceCredentials enables secure multi-tenancy by overriding operator credentials at the namespace level.
// It connects specific namespaces with credentials from a secret reference, allowing fine-grained control over
// resource reconciliation permissions. This prevents GitOps from becoming implicit God-mode by ensuring operators
// use bounded credentials for specific namespaces, supporting the principle of least privilege in enterprise
// fleet management scenarios.
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

// NamespaceCredentialsSpec defines the desired state of the NamespaceCredentials resource.
type NamespaceCredentialsSpec struct {
	// Namespaces specifies the list of Kubernetes namespaces that will use the credentials
	// from SecretRef during resource reconciliation, enabling namespace-level credential isolation.
	// +kubebuilder:validation:Required
	Namespaces []string `json:"namespaces"`

	// SecretRef references a Secret containing the credentials that operators will use
	// when reconciling resources within the specified namespaces, overriding default operator credentials.
	// +kubebuilder:validation:Required
	SecretRef corev1.SecretReference `json:"secretRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
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
