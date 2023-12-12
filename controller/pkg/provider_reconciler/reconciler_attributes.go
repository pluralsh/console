package providerreconciler

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"

	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
)

func (r *Reconciler) missingCredentialKeyError(key string) error {
	return fmt.Errorf("%q key does not exist in referenced credential secret", key)
}

func (r *Reconciler) getCloudProviderSettingsSecretRef(provider v1alpha1.Provider) *corev1.SecretReference {
	switch provider.Spec.Cloud {
	case v1alpha1.AWS:
		return provider.Spec.CloudSettings.AWS
	case v1alpha1.Azure:
		return provider.Spec.CloudSettings.Azure
	case v1alpha1.GCP:
		return provider.Spec.CloudSettings.GCP
	}

	return nil
}

func (r *Reconciler) toCloudProviderSettingsAttributes(ctx context.Context, provider v1alpha1.Provider) (*console.CloudProviderSettingsAttributes, error) {
	switch provider.Spec.Cloud {
	case v1alpha1.AWS:
		return r.toCloudProviderAWSSettingsAttributes(ctx, provider.Spec.CloudSettings.AWS)
	case v1alpha1.Azure:
		return r.toCloudProviderAzureSettingsAttributes(ctx, provider.Spec.CloudSettings.Azure)
	case v1alpha1.GCP:
		return r.toCloudProviderGCPSettingsAttributes(ctx, provider.Spec.CloudSettings.GCP)
	}

	return nil, fmt.Errorf("unsupported cloud: %q", provider.Spec.Cloud)
}

func (r *Reconciler) toCloudProviderAWSSettingsAttributes(ctx context.Context, ref *corev1.SecretReference) (*console.CloudProviderSettingsAttributes, error) {
	const accessKeyIDKeyName = "accessKeyId"
	const secretAccessKeyName = "secretAccessKey"

	secret, err := kubernetes.GetSecret(ctx, r.Client, ref)
	if err != nil {
		return nil, err
	}

	accessKeyID, exists := secret.Data[accessKeyIDKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(accessKeyIDKeyName)
	}

	secretAccessKey, exists := secret.Data[secretAccessKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(secretAccessKeyName)
	}

	return &console.CloudProviderSettingsAttributes{
		Aws: &console.AwsSettingsAttributes{
			AccessKeyID:     string(accessKeyID),
			SecretAccessKey: string(secretAccessKey),
		},
	}, nil
}

func (r *Reconciler) toCloudProviderAzureSettingsAttributes(ctx context.Context, ref *corev1.SecretReference) (*console.CloudProviderSettingsAttributes, error) {
	const tenantIDKeyName = "tenantId"
	const subscriptionIDKeyName = "subscriptionId"
	const clientIDKeyName = "clientId"
	const clientSecretKeyName = "clientSecret"

	secret, err := kubernetes.GetSecret(ctx, r.Client, ref)
	if err != nil {
		return nil, err
	}

	tenantID, exists := secret.Data[tenantIDKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(tenantIDKeyName)
	}

	subscriptionID, exists := secret.Data[subscriptionIDKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(subscriptionIDKeyName)
	}

	clientID, exists := secret.Data[clientIDKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(clientIDKeyName)
	}

	clientSecret, exists := secret.Data[clientSecretKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(clientSecretKeyName)
	}

	return &console.CloudProviderSettingsAttributes{
		Azure: &console.AzureSettingsAttributes{
			TenantID:       string(tenantID),
			SubscriptionID: string(subscriptionID),
			ClientID:       string(clientID),
			ClientSecret:   string(clientSecret),
		},
	}, nil
}

func (r *Reconciler) toCloudProviderGCPSettingsAttributes(ctx context.Context, ref *corev1.SecretReference) (*console.CloudProviderSettingsAttributes, error) {
	const applicationCredentialsKeyName = "applicationCredentials"

	secret, err := kubernetes.GetSecret(ctx, r.Client, ref)
	if err != nil {
		return nil, err
	}

	applicationCredentials, exists := secret.Data[applicationCredentialsKeyName]
	if !exists {
		return nil, r.missingCredentialKeyError(applicationCredentialsKeyName)
	}

	return &console.CloudProviderSettingsAttributes{
		Gcp: &console.GcpSettingsAttributes{
			ApplicationCredentials: string(applicationCredentials),
		},
	}, nil
}
