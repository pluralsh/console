package client

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetComplianceReportGenerator(ctx context.Context, id, name *string) (*console.ComplianceReportGeneratorFragment, error) {
	if id != nil && name != nil {
		return nil, fmt.Errorf("cannot specify both id and name")
	}
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetComplianceReportGenerator(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.ComplianceReportGenerator == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if response == nil {
		return nil, err
	}

	return response.ComplianceReportGenerator, err
}

func (c *client) UpsertComplianceReportGenerator(ctx context.Context, attr console.ComplianceReportGeneratorAttributes) (*console.ComplianceReportGeneratorFragment, error) {
	response, err := c.consoleClient.UpsertComplianceReportGenerator(ctx, attr)
	if err != nil {
		return nil, err
	}

	return response.UpsertComplianceReportGenerator, nil
}

func (c *client) DeleteComplianceReportGenerator(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("no id specified")
	}

	_, err := c.consoleClient.DeleteComplianceReportGenerator(ctx, id)
	return err
}
