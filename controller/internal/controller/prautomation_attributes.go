package controller

import (
	"context"

	console "github.com/pluralsh/console-client-go"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/utils"
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

	connectionID, err := helper.IDFromRef(pra.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
	if err != nil {
		return nil, err
	}

	return pra.Attributes(clusterID, serviceID, connectionID), nil
}
