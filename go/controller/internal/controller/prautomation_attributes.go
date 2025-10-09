package controller

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	ctrl "sigs.k8s.io/controller-runtime"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func (in *PrAutomationReconciler) Attributes(ctx context.Context, pra *v1alpha1.PrAutomation) (*console.PrAutomationAttributes, *ctrl.Result, error) {
	helper := utils.NewConsoleHelper(ctx, in.Client)

	clusterID, err := helper.IDFromRef(pra.Spec.ClusterRef, &v1alpha1.Cluster{})
	if err != nil {
		return nil, nil, err
	}

	serviceID, err := helper.IDFromRef(pra.Spec.ServiceRef, &v1alpha1.ServiceDeployment{})
	if err != nil {
		return nil, nil, err
	}

	repositoryID, err := helper.IDFromRef(pra.Spec.RepositoryRef, &v1alpha1.GitRepository{})
	if err != nil {
		return nil, nil, err
	}

	connectionID, err := helper.IDFromRef(&pra.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
	if err != nil {
		return nil, nil, err
	}
	if connectionID == nil {
		return nil, lo.ToPtr(jitterRequeue(requeueWaitForResources)), fmt.Errorf("scm connection is not ready")
	}

	projectID, err := helper.IDFromRef(pra.Spec.ProjectRef, &v1alpha1.Project{})
	if err != nil {
		return nil, nil, err
	}

	catalogID, err := helper.IDFromRef(pra.Spec.CatalogRef, &v1alpha1.Catalog{})
	if err != nil {
		return nil, nil, err
	}

	attrs := pra.Attributes(clusterID, serviceID, connectionID, repositoryID, projectID)
	attrs.CatalogID = catalogID
	return attrs, nil, nil
}
