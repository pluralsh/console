package lambda

import (
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/credentials/stscreds"
	awslambda "github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/sts"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

type AWSProvider struct {
	conn *cloudquery.Connection
}

func NewAWSProvider(conn *cloudquery.Connection) *AWSProvider {
	return &AWSProvider{conn: conn}
}

func (p *AWSProvider) Invoke(ctx context.Context, input InvocationInput) (*InvocationOutput, error) {
	cfg, err := awsConfigFromConnection(ctx, p.conn)
	if err != nil {
		return nil, err
	}

	resp, err := awslambda.NewFromConfig(cfg).Invoke(ctx, &awslambda.InvokeInput{
		FunctionName: aws.String(input.Identifier),
		Payload:      input.Payload,
	})
	if err != nil {
		return nil, err
	}

	return &InvocationOutput{
		Result: strings.TrimSpace(string(resp.Payload)),
		Error:  strings.TrimSpace(aws.ToString(resp.FunctionError)),
	}, nil
}

func awsConfigFromConnection(ctx context.Context, conn *cloudquery.Connection) (aws.Config, error) {
	awsConn := conn.GetAws()
	if awsConn == nil {
		return aws.Config{}, fmt.Errorf("%w: aws credentials are required", tools.ErrInvalidArgument)
	}

	region := strings.TrimSpace(awsConn.GetRegion())
	if region == "" {
		regions := awsConn.GetRegions()
		if len(regions) > 0 {
			region = strings.TrimSpace(regions[0])
		}
	}
	if region == "" {
		return aws.Config{}, fmt.Errorf("%w: aws region is required", tools.ErrInvalidArgument)
	}

	accessKeyID := strings.TrimSpace(awsConn.GetAccessKeyId())
	secretAccessKey := strings.TrimSpace(awsConn.GetSecretAccessKey())
	if (accessKeyID == "") != (secretAccessKey == "") {
		return aws.Config{}, fmt.Errorf("%w: aws access key and secret access key must be provided together", tools.ErrInvalidArgument)
	}

	loadOptions := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}
	if accessKeyID != "" {
		loadOptions = append(loadOptions, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		))
	}

	cfg, err := config.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return aws.Config{}, err
	}

	if roleARN := strings.TrimSpace(awsConn.GetAssumeRoleArn()); roleARN != "" {
		assumeRoleProvider := stscreds.NewAssumeRoleProvider(sts.NewFromConfig(cfg), roleARN)
		cfg.Credentials = aws.NewCredentialsCache(assumeRoleProvider)
	}

	return cfg, nil
}
