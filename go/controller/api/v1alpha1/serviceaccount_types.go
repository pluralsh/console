package v1alpha1

import (
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
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

	// Scopes defines the scope of this service account.
	// It can be used to limit the access of this service account to specific Console APIs or identifiers.
	// +kubebuilder:validation:Optional
	Scopes []ServiceAccountScope `json:"scopes,omitempty"`

	// TokenSecretRef is a secret reference that should contain token.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`
}

func (in *ServiceAccountSpec) ScopeAttributes() (result []*console.ScopeAttributes) {
	for _, scope := range in.Scopes {
		result = append(result, scope.Attributes())
	}

	return result
}

type ServiceAccountScope struct {
	// API is a name of the Console API that this service account should be scoped to.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=updateServiceDeployment
	API *string `json:"api,omitempty"`

	// Apis is a list of Console APIs that this service account should be scoped to.
	// +kubebuilder:validation:Optional
	Apis []string `json:"apis,omitempty"`

	// Identifier is a resource ID in the Console API that this service account should be scoped to.
	// Leave blank or use `*` to scope to all resources in the API.
	// +kubebuilder:validation:Optional
	Identifier *string `json:"identifier,omitempty"`

	// Ids is a list of Console API IDs that this service account should be scoped to.
	// +kubebuilder:validation:Optional
	Ids []string `json:"ids,omitempty"`
}

func (in *ServiceAccountScope) Attributes() *console.ScopeAttributes {
	return &console.ScopeAttributes{
		API:        in.API,
		Apis:       in.Apis,
		Identifier: in.Identifier,
		Ids:        in.Ids,
	}
}
