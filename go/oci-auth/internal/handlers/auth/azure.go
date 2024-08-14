package auth

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/samber/lo"
)

func authenticateAzure(ctx context.Context, url string, credentials *AzureCredentials) (
	*AuthenticationResponse, error) {
	split := strings.SplitN(url, "/", 2)
	if len(split) < 1 {
		return nil, fmt.Errorf("invalid URL: %s", url)
	}
	endpoint := fmt.Sprintf("https://%s", split[0])

	accessToken, err := getAccessToken(ctx, endpoint, credentials)
	if err != nil {
		return nil, err
	}

	acrAccessToken, err := ExchangeACRAccessToken(endpoint, accessToken.Token)
	if err != nil {
		return nil, err
	}

	return &AuthenticationResponse{
		AuthConfig: authn.AuthConfig{
			// nolint:lll
			// See: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication?tabs=azure-cli#az-acr-login-with---expose-token
			Username: "00000000-0000-0000-0000-000000000000",
			Password: acrAccessToken,
		},
		Expiry: lo.ToPtr(time.Now().Add(defaultCacheExpirationInSeconds)),
	}, nil
}

func getAccessToken(ctx context.Context, endpoint string, credentials *AzureCredentials) (azcore.AccessToken, error) {
	cloudCfg := getCloudConfiuration(endpoint)
	options := policy.TokenRequestOptions{
		Scopes: []string{cloudCfg.Services[cloud.ResourceManager].Endpoint + "/" + ".default"},
	}

	// If credentials are provided in the request, then use them.
	if credentials != nil {
		cred, err := azidentity.NewClientSecretCredential(
			credentials.TenantID, credentials.ClientID, credentials.ClientSecret, nil)
		if err != nil {
			return azcore.AccessToken{}, err
		}

		return cred.GetToken(ctx, options)
	}

	// Otherwise use default credentials.
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return azcore.AccessToken{}, err
	}

	return cred.GetToken(ctx, options)
}

func getCloudConfiuration(endpoint string) cloud.Configuration {
	if strings.HasSuffix(endpoint, ".azurecr.cn") {
		return cloud.AzureChina
	}

	if strings.HasSuffix(endpoint, ".azurecr.us") {
		return cloud.AzureGovernment
	}

	return cloud.AzurePublic
}
