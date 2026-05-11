package controller

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/argoproj/argo-rollouts/pkg/apis/rollouts"
	rolloutv1alpha1 "github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	roclientset "github.com/argoproj/argo-rollouts/pkg/client/clientset/versioned"
	clientset "github.com/argoproj/argo-rollouts/pkg/client/clientset/versioned/typed/rollouts/v1alpha1"
	"github.com/argoproj/argo-rollouts/pkg/kubectl-argo-rollouts/cmd/abort"
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/client"
	v1 "github.com/pluralsh/deployment-operator/pkg/controller/v1"
	"github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

const requeueArgoRolloutAfter = time.Second * 5

// ArgoRolloutReconciler reconciles a Argo Rollout custom resource.
type ArgoRolloutReconciler struct {
	k8sClient.Client
	Scheme        *runtime.Scheme
	ConsoleClient client.Client
	ConsoleURL    string
	HttpClient    *http.Client
	ArgoClientSet roclientset.Interface
	DynamicClient dynamic.Interface
	KubeClient    kubernetes.Interface
	SvcReconciler v1.Reconciler
}

// Reconcile Argo Rollout custom resources to ensure that Console stays in sync with Kubernetes cluster.
func (r *ArgoRolloutReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	rollout := &rolloutv1alpha1.Rollout{}
	if err := r.Get(ctx, req.NamespacedName, rollout); err != nil {
		logger.Error(err, "unable to fetch rollout")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	if !rollout.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	serviceID, ok := rollout.Annotations[common.OwningInventoryKey]
	if !ok {
		return ctrl.Result{}, nil
	}
	if serviceID == "" {
		return ctrl.Result{}, fmt.Errorf("the service ID from the inventory annotation is empty")
	}
	service, err := r.ConsoleClient.GetServiceDeploymentComponents(serviceID)
	if err != nil {
		return ctrl.Result{}, err
	}
	consoleURL, err := sanitizeURL(r.ConsoleURL)
	if err != nil {
		return ctrl.Result{}, err
	}
	if rollout.Status.Phase == rolloutv1alpha1.RolloutPhasePaused {
		// wait until the agent will change component status
		if !hasPausedRolloutComponent(service) {
			return jitterRequeue(requeueArgoRolloutAfter, jitter), nil
		}

		rolloutIf := r.ArgoClientSet.ArgoprojV1alpha1().Rollouts(rollout.Namespace)
		promoteURL := fmt.Sprintf("%s/ext/v1/gate/%s", consoleURL, serviceID)
		rollbackURL := fmt.Sprintf("%s/ext/v1/rollback/%s", consoleURL, serviceID)

		promoteResponse, err := r.get(promoteURL)
		if err != nil {
			return ctrl.Result{}, err
		}
		if promoteResponse == http.StatusOK {
			return ctrl.Result{}, r.promote(ctx, rolloutIf, rollout, serviceID)
		}
		rollbackResponse, err := r.get(rollbackURL)
		if err != nil {
			return ctrl.Result{}, err
		}
		if rollbackResponse == http.StatusOK {
			return ctrl.Result{}, r.rollback(rolloutIf, rollout)
		}
		return jitterRequeue(requeueArgoRolloutAfter, jitter), nil
	}
	return ctrl.Result{}, nil
}

func (r *ArgoRolloutReconciler) promote(ctx context.Context, rolloutIf clientset.RolloutInterface, rollout *rolloutv1alpha1.Rollout, svcId string) error {
	if _, err := utils.PromoteRollout(ctx, rolloutIf, rollout.Name); err != nil {
		return err
	}

	if r.SvcReconciler != nil {
		r.SvcReconciler.Queue().AddRateLimited(svcId)
	}
	return nil
}

func (r *ArgoRolloutReconciler) rollback(rolloutIf clientset.RolloutInterface, rollout *rolloutv1alpha1.Rollout) error {
	if _, err := abort.AbortRollout(rolloutIf, rollout.Name); err != nil {
		return err
	}
	return nil
}

func hasPausedRolloutComponent(service *console.GetServiceDeploymentComponents_ServiceDeployment) bool {
	for _, component := range service.Components {
		if component.Kind == rollouts.RolloutKind {
			if component.State != nil && *component.State == console.ComponentStatePaused {
				return true
			}
		}
	}
	return false
}

func sanitizeURL(consoleURL string) (string, error) {
	u, err := url.Parse(consoleURL)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s://%s", u.Scheme, u.Host), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ArgoRolloutReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&rolloutv1alpha1.Rollout{}).
		Complete(r)
}

func (r *ArgoRolloutReconciler) get(url string) (int, error) {
	// Make the HTTP request
	resp, err := r.HttpClient.Get(url)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	defer resp.Body.Close()

	return resp.StatusCode, nil
}
