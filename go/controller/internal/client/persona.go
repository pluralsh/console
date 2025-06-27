package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetPersona(ctx context.Context, id string) (*console.PersonaFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.GetPersona(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.Persona == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.Persona, err
}

func (c *client) CreatePersona(ctx context.Context, attr console.PersonaAttributes) (*console.PersonaFragment, error) {
	response, err := c.consoleClient.CreatePersona(ctx, attr)
	if err != nil {
		return nil, err
	}
	return response.CreatePersona, nil
}

func (c *client) UpdatePersona(ctx context.Context, id string, attr console.PersonaAttributes) (*console.PersonaFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdatePersona(ctx, id, attr)
	if err != nil {
		return nil, err
	}
	return response.UpdatePersona, nil
}

func (c *client) DeletePersona(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("no id specified")
	}

	_, err := c.consoleClient.DeletePersona(ctx, id)
	return err
}
