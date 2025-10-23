package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) DeletePreviewEnvironmentTemplate(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeletePreviewEnvironmentTemplate(ctx, id)
	return err
}

func (c *client) GetPreviewEnvironmentTemplate(ctx context.Context, id, name *string) (*console.PreviewEnvironmentTemplateFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetPreviewEnvironmentTemplate(ctx, id, nil, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.PreviewEnvironmentTemplate == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.PreviewEnvironmentTemplate, err
}

func (c *client) UpsertPreviewEnvironmentTemplate(ctx context.Context, attributes console.PreviewEnvironmentTemplateAttributes) (*console.PreviewEnvironmentTemplateFragment, error) {
	response, err := c.consoleClient.UpsertPreviewEnvironmentTemplate(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertPreviewEnvironmentTemplate, nil
}
