package client

import (
	"context"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetSentinel(ctx context.Context, id string) (*console.SentinelFragment, error) {
	response, err := c.consoleClient.GetSentinel(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.Sentinel == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}
	return response.Sentinel, err
}

func (c *client) GetSentinelTiny(ctx context.Context, id string) (*console.GetSentinelTiny_Sentinel, error) {
	response, err := c.consoleClient.GetSentinelTiny(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.Sentinel == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}
	return response.Sentinel, err
}

func (c *client) IsSentinelExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, nil
	}
	sentinel, err := c.GetSentinelTiny(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return sentinel != nil, nil
}

func (c *client) DeleteSentinel(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteSentinel(ctx, id)
	return err
}

func (c *client) CreateSentinel(ctx context.Context, attr *console.SentinelAttributes) (*console.SentinelFragment, error) {
	response, err := c.consoleClient.CreateSentinel(ctx, attr)
	if err != nil {
		return nil, err
	}

	return response.CreateSentinel, err
}

func (c *client) UpdateSentinel(ctx context.Context, id string, attr *console.SentinelAttributes) (*console.SentinelFragment, error) {
	response, err := c.consoleClient.UpdateSentinel(ctx, id, attr)
	if err != nil {
		return nil, err
	}
	return response.UpdateSentinel, nil
}

func (c *client) GetSentinelRun(ctx context.Context, id string) (*console.SentinelRunFragment, error) {
	response, err := c.consoleClient.GetSentinelRun(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.SentinelRun == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}
	return response.SentinelRun, err
}

func (c *client) RunSentinel(ctx context.Context, id string) (*string, error) {
	run, err := c.consoleClient.RunSentinel(ctx, id)
	if err != nil {
		return nil, err
	}
	return lo.ToPtr(run.RunSentinel.ID), nil
}
