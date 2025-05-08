package controller

import (
	"context"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	utilerrors "k8s.io/apimachinery/pkg/util/errors"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/yaml"
)

const apiVersion = "deployments.plural.sh/v1alpha1"

// ClusterSyncReconciler reconciles a ClusterSync object
type ClusterSyncReconciler struct {
	client.Client

	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clustersyncs/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ClusterSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	logger := log.FromContext(ctx)
	logger.V(5).Info("reconciling ClusterSync")

	clusterSync := new(v1alpha1.ClusterSync)
	if err := r.Get(ctx, req.NamespacedName, clusterSync); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, clusterSync)
	if err != nil {
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	project, res, err := GetProject(ctx, r.Client, r.Scheme, clusterSync)
	if res != nil || err != nil {
		return handleRequeue(res, err, clusterSync.SetCondition)
	}

	yamlTemplateBytes, err := yaml.Marshal(clusterSync.Spec.ClusterSpec)
	if err != nil {
		return ctrl.Result{}, err
	}
	yamlTemplate := string(yamlTemplateBytes)
	var allErrs []error

	pager := r.ListClusters(ctx, project.Status.ID, clusterSync.Spec.Tags)
	for pager.HasNext() {
		clusters, err := pager.NextPage()
		if err != nil {
			logger.Error(err, "failed to fetch cluster list")
			return ctrl.Result{}, err
		}

		for _, cluster := range clusters {
			clusterCRD, u, err := templateCluster(cluster, yamlTemplate)
			if err != nil {
				allErrs = append(allErrs, err)
				logger.Error(err, "failed to template cluster")
				continue
			}
			if clusterCRD.Namespace == "" {
				clusterCRD.Namespace = clusterSync.Namespace
			}
			existingCluster := &v1alpha1.Cluster{}
			if err := r.Client.Get(ctx, types.NamespacedName{Name: clusterCRD.Name, Namespace: clusterCRD.Namespace}, existingCluster); err != nil {
				if apierrors.IsNotFound(err) {
					// to avoid spec.cloud validation
					u.SetNamespace(clusterCRD.Namespace)
					if err := r.Client.Create(ctx, u); err != nil {
						logger.Error(err, "failed to create cluster")
						allErrs = append(allErrs, err)
					}
				} else {
					logger.Error(err, "failed to get cluster")
					allErrs = append(allErrs, err)
				}
				continue
			}
			existingSHA, err := utils.HashObject(existingCluster.Spec)
			if err != nil {
				logger.Error(err, "failed to hash existing cluster")
				allErrs = append(allErrs, err)
				continue
			}
			newSHA, err := utils.HashObject(clusterCRD.Spec)
			if err != nil {
				logger.Error(err, "failed to hash templated cluster")
				allErrs = append(allErrs, err)
				continue
			}
			if existingSHA != newSHA {
				toUpdate, err := mergeClusters(existingCluster, clusterCRD)
				if err != nil {
					logger.Error(err, "failed to merge clusters")
					allErrs = append(allErrs, err)
				}
				if err := r.Client.Update(ctx, toUpdate); err != nil {
					logger.Error(err, "failed to patch cluster")
					allErrs = append(allErrs, err)
				}
			}
		}
	}

	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(clusterSync.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	if len(allErrs) > 0 {
		aggregateError := utilerrors.NewAggregate(allErrs)
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, aggregateError.Error())
		utils.MarkCondition(clusterSync.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	}

	return requeue, nil
}

func mergeClusters(existing, new *v1alpha1.Cluster) (*unstructured.Unstructured, error) {
	existing.Spec = new.Spec
	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(existing)
	if err != nil {
		return nil, err
	}
	if new.Spec.Cloud == "" {
		unstructured.RemoveNestedField(unstructuredObj, "spec", "cloud")
	}
	return &unstructured.Unstructured{
		Object: unstructuredObj,
	}, nil
}

func templateCluster(clusterAPI *console.ClusterEdgeFragment, template string) (*v1alpha1.Cluster, *unstructured.Unstructured, error) {
	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(clusterAPI.Node)
	if err != nil {
		return nil, nil, err
	}
	configuration := map[string]interface{}{
		"cluster": unstructuredObj,
	}

	cleaned := strings.ReplaceAll(template, "'", "")

	templated, err := utils.RenderString(cleaned, configuration)
	if err != nil {
		return nil, nil, err
	}

	cst := &v1alpha1.Cluster{}
	if err := yaml.Unmarshal([]byte(templated), cst); err != nil {
		return nil, nil, err
	}
	cst.APIVersion = apiVersion
	cst.Kind = "Cluster"
	unstructuredObj, err = runtime.DefaultUnstructuredConverter.ToUnstructured(cst)
	if err != nil {
		return nil, nil, err
	}
	if cst.Spec.Cloud == "" {
		unstructured.RemoveNestedField(unstructuredObj, "spec", "cloud")
	}
	u := &unstructured.Unstructured{Object: unstructuredObj}
	return cst, u, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.ClusterSync{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *ClusterSyncReconciler) ListClusters(ctx context.Context, projectID *string, tags map[string]string) *algorithms.Pager[*console.ClusterEdgeFragment] {
	logger := log.FromContext(ctx)
	logger.V(4).Info("create cluster pager")
	fetch := func(page *string, size int64) ([]*console.ClusterEdgeFragment, *algorithms.PageInfo, error) {
		resp, err := r.ConsoleClient.ListClustersWithParameters(page, &size, projectID, tags)
		if err != nil {
			logger.Error(err, "failed to fetch stack run")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PageInfo.HasNextPage,
			After:    resp.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.ClusterEdgeFragment](100, fetch)
}
