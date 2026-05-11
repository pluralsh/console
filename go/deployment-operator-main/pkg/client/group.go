package client

import (
	internalerror "github.com/pluralsh/deployment-operator/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetGroupId(name string) (string, error) {
	response, err := c.consoleClient.GetGroupTiny(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return "", errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if err == nil && (response == nil || response.Group == nil) {
		return "", errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if response == nil {
		return "", err
	}

	return response.Group.ID, nil
}

func (c *client) GetUserId(email string) (string, error) {
	response, err := c.consoleClient.GetUserTiny(c.ctx, email)
	if internalerror.IsNotFound(err) {
		return "", errors.NewNotFound(schema.GroupResource{Resource: "user"}, email)
	}
	if err == nil && (response == nil || response.User == nil) {
		return "", errors.NewNotFound(schema.GroupResource{Resource: "user"}, email)
	}
	if response == nil {
		return "", err
	}

	return response.User.ID, nil
}
