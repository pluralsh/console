package v1alpha1

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func init() {
	SchemeBuilder.Register(&ScmConnection{}, &ScmConnectionList{})
}

// ScmConnectionList ...
// +kubebuilder:object:root=true
type ScmConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ScmConnection `json:"items"`
}

// ScmConnection ...
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the scm connection in the Console API."
// +kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.type",description="Name of the scm provider service."
type ScmConnection struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec ScmConnectionSpec `json:"spec"`
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID implements PluralResource interface
func (s *ScmConnection) ConsoleID() *string {
	return s.Status.ID
}

// ConsoleName implements PluralResource interface
func (s *ScmConnection) ConsoleName() string {
	return s.Spec.Name
}

func (s *ScmConnection) Attributes(ctx context.Context, kubeClient client.Client, token *string) (*console.ScmConnectionAttributes, error) {
	attr := &console.ScmConnectionAttributes{
		Name:     s.ConsoleName(),
		Type:     s.Spec.Type,
		Username: s.Spec.Username,
		BaseURL:  s.Spec.BaseUrl,
		APIURL:   s.Spec.APIUrl,
		Token:    token,
		Default:  s.Spec.Default,
	}
	if s.Spec.Github != nil {
		attr.Github = &console.GithubAppAttributes{
			AppID:          s.Spec.Github.AppID,
			InstallationID: s.Spec.Github.InstallationId,
		}
		if s.Spec.Github.PrivateKeyRef != nil {
			secret := new(corev1.Secret)
			if err := kubeClient.Get(ctx, client.ObjectKey{Name: s.Spec.Github.PrivateKeyRef.Name, Namespace: s.Namespace}, secret); err != nil {
				return nil, err
			}
			secretKey, ok := secret.Data[s.Spec.Github.PrivateKeyRef.Key]
			if !ok {
				return nil, fmt.Errorf("could not find secret by key %s", s.Spec.Github.PrivateKeyRef.Key)
			}
			attr.Github.PrivateKey = string(secretKey)
		}
	}

	return attr, nil
}

func (s *ScmConnection) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(s.Spec)
	if err != nil {
		return false, "", err
	}

	return !s.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (s *ScmConnection) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

type ScmConnectionSpec struct {
	// Name is a human-readable name of the ScmConnection.
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// Type is the name of the scm service for the ScmConnection.
	// One of (ScmType): [github, gitlab]
	// +kubebuilder:example:=GITHUB
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=GITHUB;GITLAB;BITBUCKET
	Type console.ScmType `json:"type"`
	// Token ...
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`
	// Username ...
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`
	// BaseUrl is a base URL for Git clones for self-hosted versions.
	// +kubebuilder:validation:Optional
	BaseUrl *string `json:"baseUrl,omitempty"`
	// APIUrl is a base URL for HTTP apis for shel-hosted versions if different from BaseUrl.
	// +kubebuilder:validation:Optional
	APIUrl *string `json:"apiUrl,omitempty"`
	// +kubebuilder:validation:Optional
	Github *ScmGithubConnection `json:"github,omitempty"`
	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`
}

type ScmGithubConnection struct {
	AppID          string `json:"appId"`
	InstallationId string `json:"installationId"`
	// +kubebuilder:validation:Optional
	PrivateKeyRef *corev1.SecretKeySelector `json:"privateKeyRef,omitempty"`
}
