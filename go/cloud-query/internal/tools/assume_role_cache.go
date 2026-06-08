package tools

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

const defaultAssumeRoleSessionName = "plural-cloud-query"

type assumeRoleCacheEntry struct {
	credentials aws.Credentials
	expiresAt   time.Time
}

var assumeRoleCache = struct {
	sync.Mutex
	entries map[string]assumeRoleCacheEntry
}{
	entries: map[string]assumeRoleCacheEntry{},
}

func cachedAssumeRoleCredentials(ctx context.Context, cfg aws.Config, roleARN string, options ...func(*sts.AssumeRoleInput)) (aws.Credentials, error) {
	roleARN = strings.TrimSpace(roleARN)
	if roleARN == "" {
		return aws.Credentials{}, fmt.Errorf("%w: assume role arn is required", ErrInvalidArgument)
	}

	now := time.Now()
	assumeRoleCache.Lock()
	if entry, ok := assumeRoleCache.entries[roleARN]; ok && now.Before(entry.expiresAt) {
		credentials := entry.credentials
		assumeRoleCache.Unlock()
		return credentials, nil
	}
	assumeRoleCache.Unlock()

	input := &sts.AssumeRoleInput{
		RoleArn:         aws.String(roleARN),
		RoleSessionName: aws.String(defaultAssumeRoleSessionName),
	}
	for _, option := range options {
		option(input)
	}

	output, err := sts.NewFromConfig(cfg).AssumeRole(ctx, input)
	if err != nil {
		return aws.Credentials{}, err
	}
	if output.Credentials == nil || output.Credentials.Expiration == nil {
		return aws.Credentials{}, fmt.Errorf("%w: assume role response did not include credentials", ErrInvalidArgument)
	}

	credentials := aws.Credentials{
		AccessKeyID:     aws.ToString(output.Credentials.AccessKeyId),
		SecretAccessKey: aws.ToString(output.Credentials.SecretAccessKey),
		SessionToken:    aws.ToString(output.Credentials.SessionToken),
		CanExpire:       true,
		Expires:         *output.Credentials.Expiration,
		Source:          "AssumeRoleCache",
	}
	expiresAt := *output.Credentials.Expiration

	assumeRoleCache.Lock()
	assumeRoleCache.entries[roleARN] = assumeRoleCacheEntry{
		credentials: credentials,
		expiresAt:   expiresAt,
	}
	assumeRoleCache.Unlock()

	return credentials, nil
}
