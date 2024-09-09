package controller

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	passwordKeyName               = "password"
	tokenKeyName                  = "token"
	secretAccessKeyKeyName        = "secretAccessKey"
	clientSecretKeyName           = "clientSecret"
	applicationCredentialsKeyName = "applicationCredentials"
)

type HelmRepositoryAuth struct {
	client.Client
	Scheme *runtime.Scheme
}

func (in *HelmRepositoryAuth) getAuthSecretRef(helmRepository *v1alpha1.HelmRepository) *corev1.SecretReference {
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

func (in *HelmRepositoryAuth) missingCredentialKeyError(key string) error {
	return fmt.Errorf("%q key does not exist in referenced credential secret", key)
}

func (in *HelmRepositoryAuth) authAttributes(ctx context.Context, helmRepository v1alpha1.HelmRepository) (*console.HelmAuthAttributes, error) {
	return in.HelmAuthAttributes(ctx, helmRepository.Spec.Provider, helmRepository.Spec.Auth)
}

func (in *HelmRepositoryAuth) HelmAuthAttributes(ctx context.Context, provider *console.HelmAuthProvider, auth *v1alpha1.HelmRepositoryAuth) (*console.HelmAuthAttributes, error) {
	if provider == nil || auth == nil {
		return nil, nil
	}

	switch *provider {
	case console.HelmAuthProviderBasic:
		return in.basicAuthAttributes(ctx, auth.Basic)
	case console.HelmAuthProviderBearer:
		return in.bearerAuthAttributes(ctx, auth.Bearer)
	case console.HelmAuthProviderAws:
		return in.awsAuthAttributes(ctx, auth.Aws)
	case console.HelmAuthProviderAzure:
		return in.azureAuthAttributes(ctx, auth.Azure)
	case console.HelmAuthProviderGcp:
		return in.gcpAuthAttributes(ctx, auth.Gcp)
	}

	return nil, nil
}

func (in *HelmRepositoryAuth) basicAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthBasic) (*console.HelmAuthAttributes, error) {
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

func (in *HelmRepositoryAuth) bearerAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthBearer) (*console.HelmAuthAttributes, error) {
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

func (in *HelmRepositoryAuth) awsAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthAWS) (*console.HelmAuthAttributes, error) {
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

func (in *HelmRepositoryAuth) azureAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthAzure) (*console.HelmAuthAttributes, error) {
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

func (in *HelmRepositoryAuth) gcpAuthAttributes(ctx context.Context, auth *v1alpha1.HelmRepositoryAuthGCP) (*console.HelmAuthAttributes, error) {
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
