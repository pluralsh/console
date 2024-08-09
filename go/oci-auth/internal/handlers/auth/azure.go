package auth

import "context"

func authenticateAzure(ctx context.Context, credentials *AzureCredentials) (*AuthenticationResponse, error) {

	// TODO: Use azidentity.NewDefaultAzureCredential and https://github.com/Azure/aks-canipull/blob/main/pkg/authorizer/token_exchanger.go#L28.

	return nil, nil
}
