package auth

import (
	"context"
	"fmt"

	awssdk "github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	awscreds "github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/credentials/stscreds"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/fluxcd/pkg/oci/auth/aws"
)

func authenticateAWS(ctx context.Context, url string, credentials *AWSCredentials) (*AuthenticationResponse, error) {
	config, err := getConfig(ctx, credentials)
	if err != nil {
		return nil, err
	}

	client := aws.NewClient()
	client.WithConfig(config)

	auth, expiry, err := client.LoginWithExpiry(ctx, true, url)
	if err != nil {
		return nil, err
	}

	cfg, err := auth.Authorization()
	if err != nil {
		return nil, err
	}
	if cfg == nil {
		return nil, fmt.Errorf("no authorization configuration found")
	}

	return &AuthenticationResponse{
		AuthConfig: *cfg,
		Expiry:     &expiry,
	}, nil
}

func getConfig(ctx context.Context, credentials *AWSCredentials) (*awssdk.Config, error) {
	// If credentials are not provided in the request, then use default credentials.
	if credentials == nil {
		return nil, nil
	}

	// Otherwise use provided credentials.
	config, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	if credentials.AccessKeyID != nil && credentials.SecretAccessKey != nil {
		config.Credentials = awscreds.NewStaticCredentialsProvider(*credentials.AccessKeyID, *credentials.SecretAccessKey, "")
	}

	if credentials.AssumeRoleARN != nil {
		stsclient := sts.NewFromConfig(config)
		config.Credentials = stscreds.NewAssumeRoleProvider(stsclient, *credentials.AssumeRoleARN)
	}

	return &config, nil
}