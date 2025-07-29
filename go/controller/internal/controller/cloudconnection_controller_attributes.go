package controller

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
)

func (r *CloudConnectionReconciler) getProviderSettingsSecretRef(spec v1alpha1.CloudConnectionSpec) v1alpha1.ObjectKeyReference {
	switch spec.Provider {
	case v1alpha1.AWS:
		return spec.Configuration.AWS.SecretAccessKey
	case v1alpha1.Azure:
		return spec.Configuration.Azure.ClientSecret
	case v1alpha1.GCP:
		return spec.Configuration.GCP.ServiceAccountKey
	}
	return v1alpha1.ObjectKeyReference{}
}

func (r *CloudConnectionReconciler) toCloudConnectionAttributes(ctx context.Context, connection v1alpha1.CloudConnection) (*console.CloudConnectionAttributes, error) {
	switch connection.Spec.Provider {
	case v1alpha1.AWS:
		return r.toCloudConnectionAWSSettingsAttributes(ctx, connection.Spec.Configuration.AWS)
	case v1alpha1.Azure:
		return r.toCloudConnectionAzureSettingsAttributes(ctx, connection.Spec.Configuration.Azure)
	case v1alpha1.GCP:
		return r.toCloudConnectionGCPSettingsAttributes(ctx, connection.Spec.Configuration.GCP)
	}

	return nil, fmt.Errorf("unsupported cloud: %q", connection.Spec.Provider)
}

func (r *CloudConnectionReconciler) toCloudConnectionAzureSettingsAttributes(ctx context.Context, azure *v1alpha1.AzureCloudConnection) (*console.CloudConnectionAttributes, error) {
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: azure.ClientSecret.Name, Namespace: azure.ClientSecret.Namespace})
	if err != nil {
		return nil, err
	}
	clientSecret, exists := secret.Data[azure.ClientSecret.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced Azure secret", azure.ClientSecret.Key)
	}
	return &console.CloudConnectionAttributes{
		Provider: console.ProviderAzure,
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

func (r *CloudConnectionReconciler) toCloudConnectionGCPSettingsAttributes(ctx context.Context, gcp *v1alpha1.GCPCloudConnection) (*console.CloudConnectionAttributes, error) {
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: gcp.ServiceAccountKey.Name, Namespace: gcp.ServiceAccountKey.Namespace})
	if err != nil {
		return nil, err
	}
	serviceAccountKey, exists := secret.Data[gcp.ServiceAccountKey.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced GCP secret", gcp.ServiceAccountKey.Key)
	}
	return &console.CloudConnectionAttributes{
		Provider: console.ProviderGCP,
		Configuration: console.CloudConnectionConfigurationAttributes{
			GCP: &console.GCPCloudConnectionAttributes{
				ServiceAccountKey: string(serviceAccountKey),
				ProjectID:         gcp.ProjectId,
			},
		},
	}, nil
}

func (r *CloudConnectionReconciler) toCloudConnectionAWSSettingsAttributes(ctx context.Context, aws *v1alpha1.AWSCloudConnection) (*console.CloudConnectionAttributes, error) {
	secret, err := utils.GetSecret(ctx, r.Client, &corev1.SecretReference{Name: aws.SecretAccessKey.Name, Namespace: aws.SecretAccessKey.Namespace})
	if err != nil {
		return nil, err
	}
	secretAccessKey, exists := secret.Data[aws.SecretAccessKey.Key]
	if !exists {
		return nil, fmt.Errorf("%q key does not exist in referenced AWS secret", aws.SecretAccessKey.Key)
	}

	return &console.CloudConnectionAttributes{
		Provider: console.ProviderAWS,
		Configuration: console.CloudConnectionConfigurationAttributes{
			AWS: &console.AWSCloudConnectionAttributes{
				AccessKeyID:     aws.AccessKeyId,
				SecretAccessKey: string(secretAccessKey),
				Region:          aws.Region,
				Regions:         lo.ToSlicePtr(aws.Regions),
			},
		},
	}, nil
}
