package controller

import (
	"context"

	console "github.com/pluralsh/console-client-go"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

func (in *PrAutomationReconciler) attributes(ctx context.Context, pra *v1alpha1.PrAutomation) (*console.PrAutomationAttributes, error) {
	clusterID, err := v1alpha1.GetConsoleID(ctx, pra.Spec.ClusterRef, &v1alpha1.Cluster{}, in.Client)
	if err != nil {
		return nil, err
	}

	serviceID, err := v1alpha1.GetConsoleID(ctx, pra.Spec.ServiceRef, &v1alpha1.ServiceDeployment{}, in.Client)
	if err != nil {
		return nil, err
	}

	connectionID, err := v1alpha1.GetConsoleID(ctx, pra.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{}, in.Client)
	if err != nil {
		return nil, err
	}

	return pra.Attributes(clusterID, serviceID, connectionID), nil
}
