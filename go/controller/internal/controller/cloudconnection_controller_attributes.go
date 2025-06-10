package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	corev1 "k8s.io/api/core/v1"
)

func getProviderSettingsSecretRef(connection *v1alpha1.CloudConnection) corev1.SecretKeySelector {
	switch connection.Spec.Provider {
	case v1alpha1.AWS:
		return connection.Spec.Configuration.AWS.SecretAccessKey
	case v1alpha1.Azure:
		return connection.Spec.Configuration.Azure.ClientSecret
	case v1alpha1.GCP:
		return connection.Spec.Configuration.GCP.ServiceAccountKey
	}
	return corev1.SecretKeySelector{}
}

func (r *CloudConnectionReconciler) toCloudConnectionAttributes(ctx context.Context, connection v1alpha1.CloudConnection) (*console.CloudConnectionAttributes, error) {
	switch connection.Spec.Provider {
	case v1alpha1.AWS:
		return r.toCloudConnectionAWSSettingsAttributes(ctx, connection.Spec.Configuration.AWS, connection.Namespace)
	case v1alpha1.Azure:
		return r.toCloudConnectionAzureSettingsAttributes(ctx, connection.Spec.Configuration.Azure, connection.Namespace)
	case v1alpha1.GCP:
		return r.toCloudConnectionGCPSettingsAttributes(ctx, connection.Spec.Configuration.GCP, connection.Namespace)
	}

	return nil, fmt.Errorf("unsupported cloud: %q", connection.Spec.Provider)
}

func (r *CloudConnectionReconciler) toCloudConnectionAzureSettingsAttributes(ctx context.Context, azure *v1alpha1.AzureCloudConnection, namespace string) (*console.CloudConnectionAttributes, error) {
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: azure.ClientSecret.Name, Namespace: namespace})
	if err != nil {
		return nil, err
	}
	clientSecret, exists := secret.Data[azure.ClientSecret.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced Azure secret", azure.ClientSecret.Key)
	}
	return &console.CloudConnectionAttributes{
		Configuration: console.CloudConnectionConfigurationAttributes{
			Azure: &console.AzureCloudConnectionAttributes{
				SubscriptionID: azure.SubscriptionId,
				TenantID:       azure.TenantId,
				ClientID:       azure.ClientId,
				ClientSecret:   string(clientSecret),
			},
		},
	}, nil
}

func (r *CloudConnectionReconciler) toCloudConnectionGCPSettingsAttributes(ctx context.Context, gcp *v1alpha1.GCPCloudConnection, namespace string) (*console.CloudConnectionAttributes, error) {
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: gcp.ServiceAccountKey.Name, Namespace: namespace})
	if err != nil {
		return nil, err
	}
	serviceAccountKey, exists := secret.Data[gcp.ServiceAccountKey.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced GCP secret", gcp.ServiceAccountKey.Key)
	}
	return &console.CloudConnectionAttributes{
		Configuration: console.CloudConnectionConfigurationAttributes{
			GCP: &console.GCPCloudConnectionAttributes{
				ServiceAccountKey: string(serviceAccountKey),
				ProjectID:         gcp.ProjectId,
			},
		},
	}, nil
}

func (r *CloudConnectionReconciler) toCloudConnectionAWSSettingsAttributes(ctx context.Context, aws *v1alpha1.AWSCloudConnection, namespace string) (*console.CloudConnectionAttributes, error) {

	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: aws.SecretAccessKey.Name, Namespace: namespace})
	if err != nil {
		return nil, err
	}
	secretAccessKey, exists := secret.Data[aws.SecretAccessKey.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced AWS secret", aws.SecretAccessKey.Key)
	}

	return &console.CloudConnectionAttributes{
		Configuration: console.CloudConnectionConfigurationAttributes{
			AWS: &console.AWSCloudConnectionAttributes{
				AccessKeyID:     aws.AccessKeyId,
				SecretAccessKey: string(secretAccessKey),
				Region:          aws.Region,
			},
		},
	}, nil
}
