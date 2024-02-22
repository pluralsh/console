package client

import (
	"context"
	console "github.com/pluralsh/console-client-go"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) SavePipeline(name string, attrs console.PipelineAttributes) (*console.PipelineFragment, error) {
	response, err := c.consoleClient.SavePipeline(c.ctx, name, attrs)
	if err != nil {
		return nil, err
	}

	return response.SavePipeline, nil
}

func (c *client) GetPipeline(id string) (*console.PipelineFragment, error) {
	response, err := c.consoleClient.GetPipeline(c.ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.Pipeline == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.Pipeline, err
}

func (c *client) ListPipelines() (*console.GetPipelines, error) {
	return c.consoleClient.GetPipelines(c.ctx, nil, nil, nil)
}

func (c *client) DeletePipeline(id string) (*console.PipelineFragment, error) {
	response, err := c.consoleClient.DeletePipeline(c.ctx, id)
	if err != nil {
		return nil, err
	}
	if response == nil {
		return nil, err
	}

	return response.DeletePipeline, nil
}

func (c *client) IsPipelineExisting(id string) bool {
	pipeline, err := c.GetPipeline(id)
	if pipeline != nil {
		return true
	}
	if errors.IsNotFound(err) {
		return false
	}

	return err == nil
}

func (c *client) GetPipelineContext(ctx context.Context, id string) (*console.PipelineContextFragment, error) {
	response, err := c.consoleClient.GetPipelineContext(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.PipelineContext == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.PipelineContext, err
}

func (c *client) CreatePipelineContext(ctx context.Context, pipelineID string, attributes console.PipelineContextAttributes) (*console.CreatePipelineContext, error) {
	return c.consoleClient.CreatePipelineContext(ctx, pipelineID, attributes)
}
