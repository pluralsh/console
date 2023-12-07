package providercontroller

import (
	"context"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"go.uber.org/zap"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// Reconciler reconciles a v1alpha1.Provider object.
// Implements reconcile.Reconciler and types.Controller
type Reconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Log           *zap.SugaredLogger
	Scheme        *runtime.Scheme
}

func (p *Reconciler) Reconcile(ctx context.Context, request reconcile.Request) (reconcile.Result, error) {
	//TODO implement me
	panic("implement me")
}

func (p *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	p.Log.Infow("starting reconciler", "reconciler", "provider_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Provider{}).
		Complete(p)
}
