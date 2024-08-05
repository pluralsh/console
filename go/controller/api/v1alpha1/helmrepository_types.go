package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&HelmRepository{}, &HelmRepositoryList{})
}

// HelmRepositoryList is a list of Helm repositories.
// +kubebuilder:object:root=true
type HelmRepositoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []HelmRepository `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Helm repository in the Console API."
type HelmRepository struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec reflects a Console API Helm repository spec.
	// +kubebuilder:validation:Required
	Spec HelmRepositorySpec `json:"spec"`

	// Status represent a status of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID returns an ID used in Console API.
func (in *HelmRepository) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns a name used in Console API.
func (in *HelmRepository) ConsoleName() string {
	return in.Name
}

func (in *HelmRepository) Attributes() console.HelmRepositoryAttributes {
	attrs := console.HelmRepositoryAttributes{
		Provider: nil,
		Auth:     nil,
	}

	return attrs
}

func (in *HelmRepository) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *HelmRepository) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

type HelmRepositorySpec struct {
	// Provider is the name of the Helm auth provider.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

type HelmRepositoryAuth struct {
	// +kubebuilder:validation:Optional
	Basic *HelmRepositoryAuthBasic `json:"basic,omitempty"`

	// +kubebuilder:validation:Optional
	Bearer *HelmRepositoryAuthBearer `json:"bearer,omitempty"`

	// +kubebuilder:validation:Optional
	Aws *HelmRepositoryAuthAWS `json:"aws,omitempty"`

	// +kubebuilder:validation:Optional
	Azure *HelmRepositoryAuthAzure `json:"azure,omitempty"`

	// +kubebuilder:validation:Optional
	Gcp *HelmRepositoryAuthGCP `json:"gcp,omitempty"`
}

type HelmRepositoryAuthBasic struct {
	// +kubebuilder:validation:Required
	Username string `json:"username"`

	// +kubebuilder:validation:Required
	Password string `json:"password"`
}

type HelmRepositoryAuthBearer struct {
	// +kubebuilder:validation:Required
	Token string `json:"token"`
}

type HelmRepositoryAuthAWS struct {
	// +kubebuilder:validation:Optional
	AccessKey *string `json:"accessKey,omitempty"`

	// SecretAccessKeySecretRef is a secret reference that should contain secret access key.
	// +kubebuilder:validation:Optional
	SecretAccessKeySecretRef *corev1.SecretReference `json:"secretAccessKeySecretRef,omitempty"`

	// +kubebuilder:validation:Optional
	AssumeRoleArn *string `json:"assumeRoleArn,omitempty"`
}

type HelmRepositoryAuthAzure struct {
	// +kubebuilder:validation:Optional
	ClientID *string `json:"clientId,omitempty"`

	// ClientSecretSecretRef is a secret reference that should contain client secret.
	// +kubebuilder:validation:Optional
	ClientSecretSecretRef *corev1.SecretReference `json:"clientSecretSecretRef,omitempty"`

	// +kubebuilder:validation:Optional
	TenantID *string `json:"tenantId,omitempty"`

	// +kubebuilder:validation:Optional
	SubscriptionID *string `json:"subscriptionId,omitempty"`
}

type HelmRepositoryAuthGCP struct {
	// ApplicationCredentialsSecretRef is a secret reference that should contain application credentials.
	// +kubebuilder:validation:Optional
	ApplicationCredentialsSecretRef *corev1.SecretReference `json:"applicationCredentialsSecretRef,omitempty"`
}
