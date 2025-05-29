package controller

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	dbsv1alpha1 "github.com/pluralsh/console/go/datastore/api/v1alpha1"
)

// ElasticSearchIndexTemplateReconciler reconciles a ElasticSearchIndexTemplate object
type ElasticSearchIndexTemplateReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=dbs.plural.sh,resources=elasticsearchindextemplates/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ElasticSearchIndexTemplate object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ElasticSearchIndexTemplateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	// TODO(user): your logic here

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ElasticSearchIndexTemplateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&dbsv1alpha1.ElasticSearchIndexTemplate{}).
		Complete(r)
}
