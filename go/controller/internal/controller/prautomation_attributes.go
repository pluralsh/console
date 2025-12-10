package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/plural"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
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

	if pra.Spec.Cluster != nil {
		id, err := plural.Cache().GetClusterID(lo.FromPtr(pra.Spec.Cluster))
		if err != nil {
			return nil, nil, err
		}
		clusterID = lo.ToPtr(id)
	}

	serviceID, err := helper.IDFromRef(pra.Spec.ServiceRef, &v1alpha1.ServiceDeployment{})
	if err != nil {
		return nil, nil, err
	}

	repositoryID, err := helper.IDFromRef(pra.Spec.RepositoryRef, &v1alpha1.GitRepository{})
	if err != nil {
		return nil, nil, err
	}

	if pra.Spec.Git.HasUrl() {
		id, err := plural.Cache().GetGitRepoID(lo.FromPtr(pra.Spec.Git.Url))
		if err != nil {
			if errors.IsNotFound(err) {
				return nil, lo.ToPtr(common.Wait()), fmt.Errorf("git repository is not ready")
			}
			return nil, nil, err
		}
		repositoryID = lo.ToPtr(id)
	}

	connectionID, err := helper.IDFromRef(&pra.Spec.ScmConnectionRef, &v1alpha1.ScmConnection{})
	if err != nil {
		return nil, nil, err
	}
	if connectionID == nil {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("scm connection is not ready")
	}

	projectID, err := helper.IDFromRef(pra.Spec.ProjectRef, &v1alpha1.Project{})
	if err != nil {
		return nil, nil, err
	}

	catalogID, err := helper.IDFromRef(pra.Spec.CatalogRef, &v1alpha1.Catalog{})
	if err != nil {
		return nil, nil, err
	}

	attrs := console.PrAutomationAttributes{
		Name:          lo.ToPtr(pra.ConsoleName()),
		Role:          pra.Spec.Role,
		Identifier:    pra.Spec.Identifier,
		Documentation: pra.Spec.Documentation,
		Title:         pra.Spec.Title,
		Message:       pra.Spec.Message,
		Branch:        pra.Spec.Branch,
		BranchPrefix:  pra.Spec.BranchPrefix,
		Icon:          pra.Spec.Icon,
		DarkIcon:      pra.Spec.DarkIcon,
		Git:           pra.Spec.Git.Attributes(),
		Updates:       pra.Spec.Updates.Attributes(),
		Creates:       pra.Spec.Creates.Attributes(),
		Deletes:       pra.Spec.Deletes.Attributes(),
		Lua:           pra.Spec.Lua.Attributes(),
		Vendor:        pra.Spec.Vendor.Attributes(),
		Addon:         pra.Spec.Addon,
		ClusterID:     clusterID,
		ServiceID:     serviceID,
		ConnectionID:  connectionID,
		RepositoryID:  repositoryID,
		ProjectID:     projectID,
		CatalogID:     catalogID,
		Patch:         pra.Spec.Patch,
		Labels:        pra.Spec.Labels,
		Confirmation:  pra.Spec.Confirmation.Attributes(),
		Secrets:       pra.Spec.Secrets.Attributes(),
		Configuration: algorithms.Map(pra.Spec.Configuration,
			func(c v1alpha1.PrAutomationConfiguration) *console.PrConfigurationAttributes { return c.Attributes() }),
	}

	if pra.Spec.Bindings != nil {
		attrs.CreateBindings, err = common.BindingsAttributes(pra.Spec.Bindings.Create)
		if err != nil {
			return nil, nil, err
		}

		attrs.WriteBindings, err = common.BindingsAttributes(pra.Spec.Bindings.Write)
		if err != nil {
			return nil, nil, err
		}
	}

	return &attrs, nil, nil
}
