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
			if helmRepository.Spec.Auth.Basic.SecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Basic.SecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderBearer:
		if helmRepository.Spec.Auth.Bearer != nil {
			if helmRepository.Spec.Auth.Bearer.TokenSecretRef != nil {
				return helmRepository.Spec.Auth.Bearer.TokenSecretRef
			}
			if helmRepository.Spec.Auth.Bearer.SecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Bearer.SecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderAws:
		if helmRepository.Spec.Auth.Aws != nil {
			if helmRepository.Spec.Auth.Aws.SecretAccessKeySecretRef != nil {
				return helmRepository.Spec.Auth.Aws.SecretAccessKeySecretRef
			}
			if helmRepository.Spec.Auth.Aws.SecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Aws.SecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderAzure:
		if helmRepository.Spec.Auth.Azure != nil {
			if helmRepository.Spec.Auth.Azure.ClientSecretSecretRef != nil {
				return helmRepository.Spec.Auth.Azure.ClientSecretSecretRef
			}
			if helmRepository.Spec.Auth.Azure.SecretKeyRef != nil {
				return &corev1.SecretReference{
					Name:      helmRepository.Spec.Auth.Azure.SecretKeyRef.Name,
					Namespace: helmRepository.Namespace,
				}
			}
		}
	case console.HelmAuthProviderGcp:
		if helmRepository.Spec.Auth.Gcp != nil {
			if helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef != nil {
				return helmRepository.Spec.Auth.Gcp.ApplicationCredentialsSecretRef
			}
			if helmRepository.Spec.Auth.Gcp.SecretKeyRef != nil {
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
	case console.HelmAuthProviderAws:
		return in.awsAuthAttributes(ctx, namespace, auth.Aws)
	case console.HelmAuthProviderAzure:
		return in.azureAuthAttributes(ctx, namespace, auth.Azure)
	case console.HelmAuthProviderGcp:
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

	if auth.SecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		pwd, exists = secret.Data[auth.SecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretKeyRef.Key)
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

	if auth.TokenSecretRef == nil && auth.SecretKeyRef == nil {
		return nil, nil
	}

	var token []byte
	var exists bool
	if auth.SecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		token, exists = secret.Data[auth.SecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretKeyRef.Key)
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
		Aws: &console.HelmAwsAuthAttributes{
			AccessKey:     auth.AccessKey,
			AssumeRoleArn: auth.AssumeRoleArn,
		},
	}

	if auth.SecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		secretAccessKey, exists := secret.Data[auth.SecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretKeyRef.Key)
		}
		attrs.Aws.SecretAccessKey = lo.ToPtr(string(secretAccessKey))

	} else if auth.SecretAccessKeySecretRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, auth.SecretAccessKeySecretRef)
		if err != nil {
			return nil, err
		}

		secretAccessKey, exists := secret.Data[secretAccessKeyKeyName]
		if !exists {
			return nil, in.missingCredentialKeyError(secretAccessKeyKeyName)
		}

		attrs.Aws.SecretAccessKey = lo.ToPtr(string(secretAccessKey))
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

	if auth.SecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		clientSecret, exists := secret.Data[auth.SecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretKeyRef.Key)
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
	if auth.SecretKeyRef == nil && auth.ApplicationCredentialsSecretRef == nil {
		return nil, nil
	}
	var appCredentials []byte
	var exists bool
	if auth.SecretKeyRef != nil {
		secret, err := utils.GetSecret(ctx, in.Client, &corev1.SecretReference{Name: auth.SecretKeyRef.Name, Namespace: namespace})
		if err != nil {
			return nil, err
		}
		appCredentials, exists = secret.Data[auth.SecretKeyRef.Key]
		if !exists {
			return nil, in.missingCredentialKeyError(auth.SecretKeyRef.Key)
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
		Gcp: &console.HelmGcpAuthAttributes{
			ApplicationCredentials: lo.ToPtr(string(appCredentials)),
		},
	}, nil
}
