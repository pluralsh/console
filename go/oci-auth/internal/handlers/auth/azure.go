package auth

import (
	"context"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
)

func authenticateAzure(ctx context.Context, url string, credentials *AzureCredentials) (*AuthenticationResponse, error) {
	accessToken, err := getAccessToken(ctx, url, credentials)
	if err != nil {
		return nil, err
	}

	_, _ = ExchangeACRAccessToken(url, accessToken.Token)

	return nil, nil
}

func getAccessToken(ctx context.Context, url string, credentials *AzureCredentials) (azcore.AccessToken, error) {
	cloudCfg := getCloudConfiuration(url)
	options := policy.TokenRequestOptions{
		Scopes: []string{cloudCfg.Services[cloud.ResourceManager].Endpoint + "/" + ".default"},
	}

	// If credentials are provided in the request, then use them.
	if credentials != nil {
		cred, err := azidentity.NewClientSecretCredential(credentials.TenantID, credentials.ClientID, credentials.ClientSecret, nil)
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

func getCloudConfiuration(url string) cloud.Configuration {
	if strings.HasSuffix(url, ".azurecr.cn") {
		return cloud.AzureChina
	}

	if strings.HasSuffix(url, ".azurecr.us") {
		return cloud.AzureGovernment
	}

	return cloud.AzurePublic
}
