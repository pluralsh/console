package lambda

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/config"
	"github.com/pluralsh/console/go/cloud-query/internal/proto/cloudquery"
	"github.com/pluralsh/console/go/cloud-query/internal/tools"
)

type InvocationInput struct {
	Identifier string
	Payload    []byte
}

type InvocationOutput struct {
	Result string
	Error  string
}

type Provider interface {
	Invoke(ctx context.Context, input InvocationInput) (*InvocationOutput, error)
}

func NewProvider(conn *cloudquery.Connection) (Provider, error) {
	if conn == nil {
		return nil, fmt.Errorf("%w: connection is required", tools.ErrInvalidArgument)
	}

	switch config.Provider(strings.ToLower(conn.GetProvider())) {
	case config.ProviderAWS:
		return NewAWSProvider(conn), nil
	case config.ProviderGCP:
		return NewGCPProvider(conn), nil
	case config.ProviderAzure:
		return NewAzureProvider(conn), nil
	default:
		return nil, tools.ErrUnsupportedOperation
	}
}
