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
			if helmRepository.Spec.Auth.Basic.PasswordSecretRef != nil {
				return helmRepository.Spec.Auth.Basic.PasswordSecretRef
			}
			if helmRepository.Spec.Auth.Basic.PasswordSecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Basic.PasswordSecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderBearer:
		if helmRepository.Spec.Auth.Bearer != nil {
			if helmRepository.Spec.Auth.Bearer.TokenSecretRef != nil {
				return helmRepository.Spec.Auth.Bearer.TokenSecretRef
			}
			if helmRepository.Spec.Auth.Bearer.TokenSecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Bearer.TokenSecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderAWS:
		if helmRepository.Spec.Auth.Aws != nil {
			if helmRepository.Spec.Auth.Aws.SecretAccessKeySecretRef != nil {
				return helmRepository.Spec.Auth.Aws.SecretAccessKeySecretRef
			}
			if helmRepository.Spec.Auth.Aws.SecretAccessKeySecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Aws.SecretAccessKeySecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderAzure:
		if helmRepository.Spec.Auth.Azure != nil {
			if helmRepository.Spec.Auth.Azure.ClientSecretSecretRef != nil {
				return helmRepository.Spec.Auth.Azure.ClientSecretSecretRef
			}
			if helmRepository.Spec.Auth.Azure.ClientSecretSecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Azure.ClientSecretSecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderGCP:
		if helmRepository.Spec.Auth.Gcp != nil {
			if helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef != nil {
				return helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef
			}
			if helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	}

	return nil
}

func (in *HelmRepositoryAuth) missingCredentialKeyError(key string) error {
	return fmt.Errorf("%q key does not exist in referenced credential secret", key)
}

func (in *HelmRepositoryAuth) authAttributes(ctx context.Context, helmRepository v1alpha1.HelmRepository) (*console.HelmAuthAttributes, error) {
	return in.HelmAuthAttributes(ctx, helmRepository.Namespace, helmRepository.Spec.Provider, helmRepository.Spec.Auth)
}

func (in *HelmRepositoryAuth) HelmAuthAttributes(ctx context.Context, namespace string, provider *console.HelmAuthProvider, auth *v1alpha1.HelmRepositoryAuth) (*console.HelmAuthAttributes, error) {
	if provider == nil || auth == nil {
		return nil, nil
	}

	switch *provider {
	case console.HelmAuthProviderBasic:
		return in.basicAuthAttributes(ctx, namespace, auth.Basic)
	case console.HelmAuthProviderBearer:
		return in.bearerAuthAttributes(ctx, namespace, auth.Bearer)
	case console.HelmAuthProviderAWS:
		return in.awsAuthAttributes(ctx, namespace, auth.Aws)
	case console.HelmAuthProviderAzure:
		return in.azureAuthAttributes(ctx, namespace, auth.Azure)
	case console.HelmAuthProviderGCP:
		return in.gcpAuthAttributes(ctx, namespace, auth.Gcp)
	}

	return nil, nil
}

func (in *HelmRepositoryAuth) basicAuthAttributes(ctx context.Context, namespace string, auth *v1alpha1.HelmRepositoryAuthBasic) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	var pwd []byte
	var exists bool

	if auth.PasswordSecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.PasswordSecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		pwd, exists = secret.Data[auth.PasswordSecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.PasswordSecretKeyRef.Key)
		}
	} else if auth.PasswordSecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.PasswordSecretRef)
		if err != nil {
			return nil, err
		}
		pwd, exists = secret.Data[passwordKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(passwordKeyName)
		}
	}

	return &console.HelmAuthAttributes{
		Basic: &console.HelmBasicAuthAttributes{
			Username: auth.Username,
			Password: string(pwd),
		},
	}, nil
}

func (in *HelmRepositoryAuth) bearerAuthAttributes(ctx context.Context, namespace string, auth *v1alpha1.HelmRepositoryAuthBearer) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	if auth.TokenSecretRef == nil && auth.TokenSecretKeyRef == nil {
		return nil, nil
	}

	var token []byte
	var exists bool
	if auth.TokenSecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.TokenSecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		token, exists = secret.Data[auth.TokenSecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.TokenSecretKeyRef.Key)
		}
	} else if auth.TokenSecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.TokenSecretRef)
		if err != nil {
			return nil, err
		}

		token, exists = secret.Data[tokenKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(tokenKeyName)
		}
	}

	return &console.HelmAuthAttributes{
		Bearer: &console.HelmBearerAuthAttributes{
			Token: string(token),
		},
	}, nil
}

func (in *HelmRepositoryAuth) awsAuthAttributes(ctx context.Context, namespace string, auth *v1alpha1.HelmRepositoryAuthAWS) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}

	attrs := &console.HelmAuthAttributes{
		AWS: &console.HelmAWSAuthAttributes{
			AccessKey:     auth.AccessKey,
			AssumeRoleArn: auth.AssumeRoleArn,
		},
	}

	if auth.SecretAccessKeySecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretAccessKeySecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		secretAccessKey, exists := secret.Data[auth.SecretAccessKeySecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretAccessKeySecretKeyRef.Key)
		}
		attrs.AWS.SecretAccessKey = lo.ToPtr(string(secretAccessKey))

	} else if auth.SecretAccessKeySecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.SecretAccessKeySecretRef)
		if err != nil {
			return nil, err
		}

		secretAccessKey, exists := secret.Data[secretAccessKeyKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(secretAccessKeyKeyName)
		}

		attrs.AWS.SecretAccessKey = lo.ToPtr(string(secretAccessKey))
	}

	return attrs, nil
}

func (in *HelmRepositoryAuth) azureAuthAttributes(ctx context.Context, namespace string, auth *v1alpha1.HelmRepositoryAuthAzure) (*console.HelmAuthAttributes, error) {
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

	if auth.ClientSecretSecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.ClientSecretSecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		clientSecret, exists := secret.Data[auth.ClientSecretSecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.ClientSecretSecretKeyRef.Key)
		}
		attrs.Azure.ClientSecret = lo.ToPtr(string(clientSecret))
	} else if auth.ClientSecretSecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.ClientSecretSecretRef)
		if err != nil {
			return nil, err
		}

		clientSecret, exists := secret.Data[clientSecretKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(clientSecretKeyName)
		}

		attrs.Azure.ClientSecret = lo.ToPtr(string(clientSecret))
	}

	return attrs, nil
}

func (in *HelmRepositoryAuth) gcpAuthAttributes(ctx context.Context, namespace string, auth *v1alpha1.HelmRepositoryAuthGCP) (*console.HelmAuthAttributes, error) {
	if auth == nil {
		return nil, nil
	}
	if auth.ApplicationCredentialsSecretKeyRef == nil && auth.ApplicationCredentialsSecretRef == nil {
		return nil, nil
	}
	var appCredentials []byte
	var exists bool
	if auth.ApplicationCredentialsSecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.ApplicationCredentialsSecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		appCredentials, exists = secret.Data[auth.ApplicationCredentialsSecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.ApplicationCredentialsSecretKeyRef.Key)
		}
	} else if auth.ApplicationCredentialsSecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.ApplicationCredentialsSecretRef)
		if err != nil {
			return nil, err
		}

		appCredentials, exists = secret.Data[applicationCredentialsKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(applicationCredentialsKeyName)
		}
	}

	return &console.HelmAuthAttributes{
		GCP: &console.HelmGCPAuthAttributes{
			ApplicationCredentials: lo.ToPtr(string(appCredentials)),
		},
	}, nil
}
