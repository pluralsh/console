package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
)

const (
	passwordKeyName               = "password"
	tokenKeyName                  = "token"
	secretAccessKeyKeyName        = "secretAccessKey"
	clientSecretKeyName           = "clientSecret"
	applicationCredentialsKeyName = "applicationCredentials"
)

func (in *HelmRepositoryReconciler) getAuthSecretRef(helmRepository *v1alpha1.HelmRepository) *corev1.SecretReference {
	if helmRepository.Spec.Provider == nil || helmRepository.Spec.Auth == nil {
		return nil
	}
	switch *helmRepository.Spec.Provider {
	case console.HelmAuthProviderBasic:
		if helmRepository.Spec.Auth.Basic != nil {
			return &helmRepository.Spec.Auth.Basic.PasswordSecretRef
		}
	case console.HelmAuthProviderBearer:
		if helmRepository.Spec.Auth.Bearer != nil {
			return &helmRepository.Spec.Auth.Bearer.TokenSecretRef
		}
	case console.HelmAuthProviderAws:
		if helmRepository.Spec.Auth.Aws != nil {
			return helmRepository.Spec.Auth.Aws.SecretAccessKeySecretRef
		}
	case console.HelmAuthProviderAzure:
		if helmRepository.Spec.Auth.Azure != nil {
			return helmRepository.Spec.Auth.Azure.ClientSecretSecretRef
		}
	case console.HelmAuthProviderGcp:
		if helmRepository.Spec.Auth.Gcp != nil {
			return helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef
		}
	}

	return nil
}

func (in *HelmRepositoryReconciler) tryAddOwnerRef(ctx context.Context, helmRepository *v1alpha1.HelmRepository) error {
	secretRef := in.getAuthSecretRef(helmRepository)
	if secretRef == nil {
		return nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, secretRef)
	if err != nil {
		return err
	}

	return utils.TryAddControllerRef(ctx, in.Client, helmRepository, secret, in.Scheme)
}

func (in *HelmRepositoryReconciler) missingCredentialKeyError(key string) error {
	return fmt.Errorf("%q key does not exist in referenced credential secret", key)
}

func (in *HelmRepositoryReconciler) authAttributes(ctx context.Context, helmRepository v1alpha1.HelmRepository) (*console.HelmAuthAttributes, error) {
	if helmRepository.Spec.Provider == nil || helmRepository.Spec.Auth == nil {
		return nil, nil
	}

	switch *helmRepository.Spec.Provider {
	case console.HelmAuthProviderBasic:
		return in.basicAuthAttributes(ctx, helmRepository.Spec.Auth.Basic)
	case console.HelmAuthProviderBearer:
		return in.bearerAuthAttributes(ctx, helmRepository.Spec.Auth.Bearer)
	case console.HelmAuthProviderAws:
		return in.awsAuthAttributes(ctx, helmRepository.Spec.Auth.Aws)
	case console.HelmAuthProviderAzure:
		return in.azureAuthAttributes(ctx, helmRepository.Spec.Auth.Azure)
	case console.HelmAuthProviderGcp:
		return in.gcpAuthAttributes(ctx, helmRepository.Spec.Auth.Gcp)
	}

	return nil, nil
}

func (in *HelmRepositoryReconciler) basicAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthBasic) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, &auth.PasswordSecretRef)
	if err != nil {
		return nil, err
	}

	pwd, exists := secret.Data[passwordKeyName]
	if !exists {
		return nil, in.missingCredentialKeyError(passwordKeyName)
	}

	return &console.HelmAuthAttributes{
		Basic: &console.HelmBasicAuthAttributes{
			Username: auth.Username,
			Password: string(pwd),
		},
	}, nil
}

func (in *HelmRepositoryReconciler) bearerAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthBearer) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, &auth.TokenSecretRef)
	if err != nil {
		return nil, err
	}

	token, exists := secret.Data[tokenKeyName]
	if !exists {
		return nil, in.missingCredentialKeyError(tokenKeyName)
	}

	return &console.HelmAuthAttributes{
		Bearer: &console.HelmBearerAuthAttributes{
			Token: string(token),
		},
	}, nil
}

func (in *HelmRepositoryReconciler) awsAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthAWS) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	attrs := &console.HelmAuthAttributes{
		Aws: &console.HelmAwsAuthAttributes{
			AccessKey:     auth.AccessKey,
			AssumeRoleArn: auth.AssumeRoleArn,
		},
	}

	if auth.SecretAccessKeySecretRef == nil {
		return attrs, nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, auth.SecretAccessKeySecretRef)
	if err != nil {
		return nil, err
	}

	secretAccessKey, exists := secret.Data[secretAccessKeyKeyName]
	if !exists {
		return nil, in.missingCredentialKeyError(secretAccessKeyKeyName)
	}

	attrs.Aws.SecretAccessKey = lo.ToPtr(string(secretAccessKey))

	return attrs, nil
}

func (in *HelmRepositoryReconciler) azureAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthAzure) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	attrs := &console.HelmAuthAttributes{
		Azure: &console.HelmAzureAuthAttributes{
			ClientID:       auth.ClientID,
			TenantID:       auth.TenantID,
			SubscriptionID: auth.SubscriptionID,
		},
	}

	if auth.ClientSecretSecretRef == nil {
		return attrs, nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, auth.ClientSecretSecretRef)
	if err != nil {
		return nil, err
	}

	clientSecret, exists := secret.Data[clientSecretKeyName]
	if !exists {
		return nil, in.missingCredentialKeyError(clientSecretKeyName)
	}

	attrs.Azure.ClientSecret = lo.ToPtr(string(clientSecret))

	return attrs, nil
}

func (in *HelmRepositoryReconciler) gcpAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthGCP) (*console.HelmAuthAttributes, error) {
	if auth == nil || auth.ApplicationCredentialsSecretRef == nil {
		return nil, nil
	}

	secret, err := utils.GetSecret(ctx, in.Client, auth.ApplicationCredentialsSecretRef)
	if err != nil {
		return nil, err
	}

	appCredentials, exists := secret.Data[applicationCredentialsKeyName]
	if !exists {
		return nil, in.missingCredentialKeyError(applicationCredentialsKeyName)
	}

	return &console.HelmAuthAttributes{
		Gcp: &console.HelmGcpAuthAttributes{
			ApplicationCredentials: lo.ToPtr(string(appCredentials)),
		},
	}, nil
}
