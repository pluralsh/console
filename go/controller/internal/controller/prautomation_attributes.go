package controller

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func (in *PrAutomationReconciler) attributes(ctx context.Context, pra *v1alpha1.PrAutomation) (*console.PrAutomationAttributes, error) {
	helper := utils.NewConsoleHelper(ctx, in.ConsoleClient, in.Client)

	clusterID, err := helper.IDFromRef(pra.Spec.ClusterRef, &v1alpha1.Cluster{})
	if err != nil {
		return nil, err
	}

	serviceID, err := helper.IDFromRef(pra.Spec.ServiceRef, &v1alpha1.ServiceDeployment{})
	if err != nil {
		return nil, err
	}

	repositoryID, err := helper.IDFromRef(pra.Spec.RepositoryRef, &v1alpha1.GitRepository{})
	if err != nil {
		return nil, err
	}

	connectionID, err := helper.IDFromRef(&pra.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
	if err != nil {
		return nil, err
	}
	if connectionID == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, pra.Spec.ScmConnectionRef.Name)
	}

	projectID, err := helper.IDFromRef(pra.Spec.ProjectRef, &v1alpha1.Project{})
	if err != nil {
		return nil, err
	}

	return pra.Attributes(clusterID, serviceID, connectionID, repositoryID, projectID), nil
}
