package v1alpha1

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ScmConnection{}, &ScmConnectionList{})
}

// +kubebuilder:object:root=true

// ScmConnectionList contains a list of ScmConnection resources.
type ScmConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ScmConnection `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the SCM connection in the Console API."
// +kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.type",description="Name of the SCM provider service."

// ScmConnection provides authentication credentials and configuration for connecting to source control
// management providers like GitHub, GitLab, and Bitbucket. It enables Plural to interact with your
// repositories for PR automation, webhook management, and git-based workflows. You can either create
// a new connection with full credentials or reference an existing SCM connection from the Plural UI
// by specifying the provider type and name while leaving other fields blank.
type ScmConnection struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the ScmConnection, including provider type,
	// authentication details, and connection settings.
	// +kubebuilder:validation:Required
	Spec ScmConnectionSpec `json:"spec"`

	// Status represents the current state of this ScmConnection resource.
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

// ScmConnectionSpec defines the desired state of the ScmConnection.
type ScmConnectionSpec struct {
	// Name is a human-readable identifier for this SCM connection.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Type specifies the source control management provider for this connection.
	// Supported providers include GITHUB, GITLAB, and BITBUCKET.
	// +kubebuilder:example:=GITHUB
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=GITHUB;GITLAB;BITBUCKET
	Type console.ScmType `json:"type"`

	// TokenSecretRef references a Kubernetes secret containing the access token for
	// authenticating with the SCM provider. The token should be stored in the 'token'
	// data field of the referenced secret.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`

	// Username is the username for HTTP basic authentication with the SCM provider.
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`

	// BaseUrl is the base URL for Git clone operations when using self-hosted SCM providers.
	// For cloud-hosted providers like GitHub.com, this can be omitted to use default URLs.
	// +kubebuilder:validation:Optional
	BaseUrl *string `json:"baseUrl,omitempty"`

	// APIUrl is the base URL for HTTP API calls to self-hosted SCM providers.
	// If different from BaseUrl, this allows separate configuration for Git operations
	// and API interactions.
	// +kubebuilder:validation:Optional
	APIUrl *string `json:"apiUrl,omitempty"`

	// Github contains GitHub App-specific authentication configuration.
	// +kubebuilder:validation:Optional
	Github *ScmGithubConnection `json:"github,omitempty"`

	// Default indicates whether this SCM connection should be used as the default connection.
	// Only one connection should be marked as default.
	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`
}

// ScmGithubConnection defines GitHub App authentication parameters.
type ScmGithubConnection struct {
	// AppID is the unique identifier of the GitHub App used for authentication.
	AppID string `json:"appId"`

	// InstallationId is the unique identifier of the GitHub App installation.
	InstallationId string `json:"installationId"`

	// PrivateKeyRef references a Kubernetes secret containing the private key for the GitHub App.
	// +kubebuilder:validation:Optional
	PrivateKeyRef *corev1.SecretKeySelector `json:"privateKeyRef,omitempty"`
}
