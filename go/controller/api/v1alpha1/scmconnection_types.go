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

// ScmConnectionList ...
// +kubebuilder:object:root=true
type ScmConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ScmConnection `json:"items"`
}

// ScmConnection is a container for credentials to a scm provider.  You can also reference a SCM connection created in the Plural UI via the provider + name, leaving all other fields blank.
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

	if s.Spec.Proxy != nil {
		attr.Proxy = &console.HTTPProxyAttributes{
			URL: s.Spec.Proxy.URL,
		}
	}

	if s.Spec.Azure != nil {
		attr.Azure = &console.AzureDevopsAttributes{
			Username:     s.Spec.Azure.Username,
			Organization: s.Spec.Azure.Organization,
			Project:      s.Spec.Azure.Project,
		}
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
	// One of (ScmType): [GITHUB, GITLAB, AZURE_DEVOPS, BITBUCKET]
	// +kubebuilder:example:=GITHUB
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=GITHUB;GITLAB;BITBUCKET;AZURE_DEVOPS
	Type console.ScmType `json:"type"`
	// A secret containing this access token you will use, stored in the `token` data field.
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

	// Settings for configuring Github App authentication
	// +kubebuilder:validation:Optional
	Github *ScmGithubConnection `json:"github,omitempty"`

	// Settings for configuring Azure DevOps authentication
	// +kubebuilder:validation:Optional
	Azure *AzureDevopsSettings `json:"azure,omitempty"`

	// Configures usage of an HTTP proxy for all requests involving this SCM connection.
	// +kubebuilder:validation:Optional
	Proxy *HttpProxyConfiguration `json:"proxy,omitempty"`

	// +kubebuilder:validation:Optional
	Default *bool `json:"default,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

type ScmGithubConnection struct {
	// The Github App ID to use for authentication (can be found on the Github Apps settings page)
	AppID string `json:"appId"`
	// The installation ID of your install of the Github App (found on the Github Apps section of your github repo/organization, located in the url path)
	InstallationId string `json:"installationId"`
	// +kubebuilder:validation:Optional
	PrivateKeyRef *corev1.SecretKeySelector `json:"privateKeyRef,omitempty"`
}

type AzureDevopsSettings struct {
	// The username to use for azure devops, it should be associated with the PAT you are supplying as the tokenSecretRef
	Username string `json:"username"`
	// The organization to use for azure devops
	Organization string `json:"organization"`
	// The project to use for azure devops
	Project string `json:"project"`
}

type HttpProxyConfiguration struct {
	// The url of your HTTP proxy.
	// +kubebuilder:validation:Required
	URL string `json:"url"`
}
