package client

import (
	"context"

	console "github.com/pluralsh/console/client"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) UpsertNotificationSink(ctx context.Context, attr console.NotificationSinkAttributes) (*console.NotificationSinkFragment, error) {
	response, err := c.consoleClient.UpsertNotificationSink(ctx, attr)
	if err != nil {
		return nil, err
	}
	return response.UpsertNotificationSink, nil
}

func (c *client) GetNotificationSink(ctx context.Context, id string) (*console.NotificationSinkFragment, error) {
	response, err := c.consoleClient.GetNotificationSink(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.NotificationSink == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.NotificationSink, err
}

func (c *client) GetNotificationSinkByName(ctx context.Context, name string) (*console.NotificationSinkFragment, error) {
	response, err := c.consoleClient.GetNotificationSinkByName(ctx, &name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.NotificationSink == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.NotificationSink, err
}

func (c *client) DeleteNotificationSink(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteNotificationSink(ctx, id)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) GetNotificationRouter(ctx context.Context, id string) (*console.NotificationRouterFragment, error) {
	response, err := c.consoleClient.GetNotificationRouter(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.NotificationRouter == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.NotificationRouter, err
}

func (c *client) GetNotificationRouterByName(ctx context.Context, name string) (*console.NotificationRouterFragment, error) {
	response, err := c.consoleClient.GetNotificationRouterByName(ctx, &name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.NotificationRouter == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.NotificationRouter, err
}

func (c *client) DeleteNotificationRouter(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteNotificationRouter(ctx, id)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) UpsertNotificationRouter(ctx context.Context, attr console.NotificationRouterAttributes) (*console.NotificationRouterFragment, error) {
	response, err := c.consoleClient.UpsertNotificationRouter(ctx, attr)
	if err != nil {
		return nil, err
	}
	return response.UpsertNotificationRouter, nil
}
