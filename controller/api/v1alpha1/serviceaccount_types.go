package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ServiceAccount{}, &ServiceAccountList{})
}

// ServiceAccountList is a list of service accounts.
// +kubebuilder:object:root=true
type ServiceAccountList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ServiceAccount `json:"items"`
}

// ServiceAccount is a type of non-human account that provides distinct identity.
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the service account in the Console API."
type ServiceAccount struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API service account spec.
	// +kubebuilder:validation:Required
	Spec ServiceAccountSpec `json:"spec"`

	// Status represent a status of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID returns an ID used in Console API.
func (in *ServiceAccount) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns a name used in Console API.
func (in *ServiceAccount) ConsoleName() string {
	return in.Name
}

func (in *ServiceAccount) Attributes() console.ServiceAccountAttributes {
	attrs := console.ServiceAccountAttributes{
		Name:  lo.ToPtr(in.ConsoleName()),
		Email: &in.Spec.Email,
	}

	return attrs
}

func (in *ServiceAccount) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *ServiceAccount) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

type ServiceAccountSpec struct {
	// Email address to that will be bound to this service account.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=some@email.com
	Email string `json:"email"`

	// TokenSecretRef is a secret reference that should contain token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`
}
