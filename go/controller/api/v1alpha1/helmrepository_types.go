package v1alpha1

import (
	"context"

	"github.com/pluralsh/console/go/controller/api/common"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&HelmRepository{}, &HelmRepositoryList{})
}

// +kubebuilder:object:root=true

// HelmRepositoryList contains a list of HelmRepository resources.
type HelmRepositoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []HelmRepository `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Helm repository in the Console API."

// HelmRepository is a Kubernetes custom resource that represents a Helm chart repository
// for use with the Plural Console deployment system. It enables integration with various
// Helm repository providers including public repositories, private cloud-hosted repositories,
// and on-premises solutions with comprehensive authentication support.
type HelmRepository struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the HelmRepository, including the repository URL
	// and authentication configuration. The URL is immutable once set to ensure consistency
	// across deployments and prevent accidental repository changes.
	// +kubebuilder:validation:Required
	Spec HelmRepositorySpec `json:"spec"`

	// Status represents the current state of this HelmRepository resource, including
	// synchronization status with the Console API and any error conditions.
	// +kubebuilder:validation:Optional
	Status common.Status `json:"status,omitempty"`
}

// ConsoleID returns the unique identifier used in the Console API for this Helm repository.
// This ID is used for cross-referencing between the Kubernetes resource and the Console's
// internal representation of the repository.
func (in *HelmRepository) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns the name used in the Console API for this Helm repository.
// By convention, this uses the repository URL as the identifier since URLs are unique.
func (in *HelmRepository) ConsoleName() string {
	return in.Spec.URL
}

// AuthAttributesGetter is a helper function interface that can be implemented to properly build Console API attributes
// for Helm repository authentication. It takes a context and HelmRepository and returns the authentication attributes
// needed for Console API integration, allowing for dynamic credential resolution at runtime.
// +kubebuilder:object:generate:=false
type AuthAttributesGetter func(context.Context, HelmRepository) (*console.HelmAuthAttributes, error)

// Attributes converts the HelmRepository spec to Console API attributes for upstream synchronization.
// It uses the provided AuthAttributesGetter to resolve authentication credentials dynamically,
// allowing for secret-based authentication and runtime credential resolution.
func (in *HelmRepository) Attributes(ctx context.Context, authAttributesGetter AuthAttributesGetter) (*console.HelmRepositoryAttributes, error) {
	authAttributes, err := authAttributesGetter(ctx, *in)
	return &console.HelmRepositoryAttributes{
		Provider: in.Spec.Provider,
		Auth:     authAttributes,
	}, err
}

// Diff compares the current HelmRepository configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison. This is used for drift detection and
// ensuring the Console API stays synchronized with the Kubernetes resource state.
func (in *HelmRepository) Diff(ctx context.Context, getter AuthAttributesGetter, hasher Hasher) (changed bool, sha string, err error) {
	cloudSettings, err := getter(ctx, *in)
	if err != nil {
		return false, "", err
	}

	currentSha, err := hasher(cloudSettings)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the HelmRepository status.
func (in *HelmRepository) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// HelmRepositorySpec defines the desired state of a HelmRepository.
type HelmRepositorySpec struct {
	// URL specifies the HTTP/HTTPS URL of the Helm repository.
	// This field is immutable once set to prevent accidental changes that could break
	// existing service deployments that depend on this repository.
	// Supported formats include standard Helm repository URLs and OCI registry URLs.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Provider specifies the authentication provider type for this Helm repository.
	// This determines which authentication method will be used when accessing the repository.
	// Different providers support different authentication mechanisms optimized for their platforms.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains the authentication configuration for accessing the Helm repository.
	// The specific authentication method used depends on the Provider field.
	// Only one authentication method should be configured per repository.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *common.Reconciliation `json:"reconciliation,omitempty"`
}

// HelmRepositoryAuth defines the authentication configuration for a Helm repository.
// It supports multiple authentication methods, but only one should be specified per repository.
// The authentication method used should match the Provider specified in the HelmRepositorySpec.
type HelmRepositoryAuth struct {
	// Basic specifies username/password authentication for repositories that support HTTP Basic Auth.
	// Commonly used with private Helm repositories, Harbor registries, and other traditional
	// repository managers that implement standard HTTP authentication.
	// +kubebuilder:validation:Optional
	Basic *HelmRepositoryAuthBasic `json:"basic,omitempty"`

	// Bearer specifies token-based authentication for repositories that support Bearer tokens.
	// Used with modern container registries and repositories that implement OAuth2 or similar
	// token-based authentication schemes.
	// +kubebuilder:validation:Optional
	Bearer *HelmRepositoryAuthBearer `json:"bearer,omitempty"`

	// Aws specifies AWS-specific authentication for Amazon ECR and other AWS-hosted repositories.
	// Supports both static credentials and IAM role-based authentication for secure access
	// to private repositories hosted in Amazon Web Services.
	// +kubebuilder:validation:Optional
	Aws *HelmRepositoryAuthAWS `json:"aws,omitempty"`

	// Azure specifies Azure-specific authentication for Azure Container Registry (ACR).
	// Supports service principal authentication and managed identity for secure access
	// to private repositories hosted in Microsoft Azure.
	// +kubebuilder:validation:Optional
	Azure *HelmRepositoryAuthAzure `json:"azure,omitempty"`

	// Gcp specifies Google Cloud-specific authentication for Google Artifact Registry.
	// Supports service account key authentication for secure access to private
	// repositories hosted in Google Cloud Platform.
	// +kubebuilder:validation:Optional
	Gcp *HelmRepositoryAuthGCP `json:"gcp,omitempty"`
}

// HelmRepositoryAuthBasic defines username/password authentication for Helm repositories.
// This authentication method is widely supported by traditional repository managers
// and provides a simple way to secure access to private Helm charts.
type HelmRepositoryAuthBasic struct {
	// Username specifies the username for HTTP Basic authentication.
	// This is typically a user account or service account name configured
	// in the target repository system.
	// +kubebuilder:validation:Required
	Username string `json:"username"`

	// PasswordSecretRef references a Kubernetes Secret containing the password for Basic authentication.
	// The entire secret content will be used as the password.
	// This approach is deprecated in favor of PasswordSecretKeyRef for better secret management.
	// +kubebuilder:validation:Optional
	PasswordSecretRef *corev1.SecretReference `json:"passwordSecretRef,omitempty"`

	// PasswordSecretKeyRef references a specific key within a Kubernetes Secret that contains the password.
	// This is the preferred method for password storage as it allows multiple credentials
	// to be stored in a single secret with proper key-based access.
	// +kubebuilder:validation:Optional
	PasswordSecretKeyRef *corev1.SecretKeySelector `json:"passwordSecretKeyRef,omitempty"`
}

// HelmRepositoryAuthBearer defines token-based authentication for Helm repositories.
// This authentication method is commonly used with modern container registries
// and repositories that implement OAuth2 or similar token-based authentication.
type HelmRepositoryAuthBearer struct {
	// TokenSecretRef references a Kubernetes Secret containing the bearer token.
	// The entire secret content will be used as the authentication token.
	// This approach is deprecated in favor of TokenSecretKeyRef for better secret management.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`

	// TokenSecretKeyRef references a specific key within a Kubernetes Secret that contains the bearer token.
	// This is the preferred method for token storage as it allows multiple tokens
	// to be stored in a single secret with proper key-based access.
	// +kubebuilder:validation:Optional
	TokenSecretKeyRef *corev1.SecretKeySelector `json:"tokenSecretKeyRef,omitempty"`
}

// HelmRepositoryAuthAWS defines AWS-specific authentication for Amazon ECR and other AWS-hosted repositories.
// It supports both static credentials and IAM role assumption for flexible authentication
// in various AWS deployment scenarios.
type HelmRepositoryAuthAWS struct {
	// AccessKey specifies the AWS access key ID for authentication.
	// When using static credentials, this should be set along with the secret access key.
	// For enhanced security, consider using IAM roles instead of static credentials.
	// +kubebuilder:validation:Optional
	AccessKey *string `json:"accessKey,omitempty"`

	// SecretAccessKeySecretRef references a Kubernetes Secret containing the AWS secret access key.
	// The entire secret content will be used as the secret access key.
	// This approach is deprecated in favor of SecretAccessKeySecretKeyRef for better secret management.
	// +kubebuilder:validation:Optional
	SecretAccessKeySecretRef *corev1.SecretReference `json:"secretAccessKeySecretRef,omitempty"`

	// SecretAccessKeySecretKeyRef references a specific key within a Kubernetes Secret containing the secret access key.
	// This is the preferred method for storing AWS credentials as it allows multiple
	// credential sets to be organized within a single secret.
	// +kubebuilder:validation:Optional
	SecretAccessKeySecretKeyRef *corev1.SecretKeySelector `json:"secretAccessKeySecretKeyRef,omitempty"`

	// AssumeRoleArn specifies an AWS IAM role ARN to assume for repository access.
	// This enables cross-account access and role-based authentication, providing
	// enhanced security and flexibility in AWS environments.
	// +kubebuilder:validation:Optional
	AssumeRoleArn *string `json:"assumeRoleArn,omitempty"`
}

// HelmRepositoryAuthAzure defines Azure-specific authentication for Azure Container Registry (ACR).
// It supports service principal authentication which is the recommended approach
// for automated access to private Azure repositories.
type HelmRepositoryAuthAzure struct {
	// ClientID specifies the Azure service principal client ID.
	// This is used in conjunction with the client secret to authenticate with Azure services.
	// +kubebuilder:validation:Optional
	ClientID *string `json:"clientId,omitempty"`

	// ClientSecretSecretRef references a Kubernetes Secret containing the Azure service principal client secret.
	// The entire secret content will be used as the client secret.
	// This approach is deprecated in favor of ClientSecretSecretKeyRef for better secret management.
	// +kubebuilder:validation:Optional
	ClientSecretSecretRef *corev1.SecretReference `json:"clientSecretSecretRef,omitempty"`

	// ClientSecretSecretKeyRef references a specific key within a Kubernetes Secret containing the client secret.
	// This is the preferred method for storing Azure credentials as it allows proper
	// secret organization and key-based access control.
	// +kubebuilder:validation:Optional
	ClientSecretSecretKeyRef *corev1.SecretKeySelector `json:"clientSecretSecretKeyRef,omitempty"`

	// TenantID specifies the Azure Active Directory tenant ID.
	// This identifies the Azure AD instance that contains the service principal
	// and is required for proper authentication scope.
	// +kubebuilder:validation:Optional
	TenantID *string `json:"tenantId,omitempty"`

	// SubscriptionID specifies the Azure subscription ID.
	// This identifies the Azure subscription containing the resources
	// and may be required for certain repository access scenarios.
	// +kubebuilder:validation:Optional
	SubscriptionID *string `json:"subscriptionId,omitempty"`
}

// HelmRepositoryAuthGCP defines Google Cloud-specific authentication for Google Artifact Registry.
// It uses service account key-based authentication which is the standard approach
// for accessing private Google Cloud repositories from external systems.
type HelmRepositoryAuthGCP struct {
	// ApplicationCredentialsSecretRef references a Kubernetes Secret containing the GCP service account key JSON.
	// The entire secret content will be used as the service account credentials.
	// This approach is deprecated in favor of ApplicationCredentialsSecretKeyRef for better secret management.
	// +kubebuilder:validation:Optional
	ApplicationCredentialsSecretRef *corev1.SecretReference `json:"applicationCredentialsSecretRef,omitempty"`

	// ApplicationCredentialsSecretKeyRef references a specific key within a Kubernetes Secret containing the service account JSON.
	// This is the preferred method for storing GCP credentials as it allows multiple
	// service account keys to be organized within a single secret with proper access control.
	// +kubebuilder:validation:Optional
	ApplicationCredentialsSecretKeyRef *corev1.SecretKeySelector `json:"applicationCredentialsSecretKeyRef,omitempty"`
}
