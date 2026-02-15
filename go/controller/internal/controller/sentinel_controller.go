package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/plural"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

const SentinelFinalizer = "deployments.plural.sh/sentinel-protection"

var (
	ErrGetRepository  = errors.New("failed to get Git repository")
	ErrWaitRepository = errors.New("repository not ready")
)

// SentinelReconciler reconciles a Sentinel object
type SentinelReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *SentinelReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := ctrl.LoggerFrom(ctx)

	sentinel := &v1alpha1.Sentinel{}
	if err := r.Get(ctx, req.NamespacedName, sentinel); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, sentinel)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(sentinel.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(sentinel, sentinel.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if result := r.addOrRemoveFinalizer(ctx, sentinel); result != nil {
		return *result, nil
	}

	var repositoryID *string
	if sentinel.Spec.Git.HasUrl() {
		id, err := plural.Cache().GetGitRepoID(lo.FromPtr(sentinel.Spec.Git.Url))
		if err != nil {
			return common.HandleRequeue(nil, err, sentinel.SetCondition)
		}
		repositoryID = id
	}

	if sentinel.Spec.RepositoryRef != nil {
		repository := &v1alpha1.GitRepository{}
		if err := r.Get(ctx, client.ObjectKey{Name: sentinel.Spec.RepositoryRef.Name, Namespace: sentinel.Spec.RepositoryRef.Namespace}, repository); err != nil {
			return common.HandleRequeue(nil, err, sentinel.SetCondition)
		}
		if !repository.Status.HasID() {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
			return common.Wait(), nil
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not healthy")
			return common.Wait(), nil
		}
		repositoryID = repository.Status.ID
	}
	project := &v1alpha1.Project{}
	if sentinel.Spec.ProjectRef != nil {
		var res *ctrl.Result
		project, res, err = common.Project(ctx, r.Client, r.Scheme, sentinel)
		if res != nil || err != nil {
			return common.HandleRequeue(res, err, sentinel.SetCondition)
		}
	}

	attr, err := r.attributes(ctx, sentinel, repositoryID, project)
	if err != nil {
		if errors.Is(err, ErrWaitRepository) {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready or healthy")
			return common.Wait(), nil
		}
		if errors.Is(err, ErrGetRepository) {
			return common.HandleRequeue(nil, err, sentinel.SetCondition)
		}
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(attr)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	existingSentinel, err := r.sync(ctx, sentinel, attr)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if sentinel.Status.HasSHA() && !sentinel.Status.IsSHAEqual(sha) {
		if _, err := r.ConsoleClient.UpdateSentinel(ctx, existingSentinel.ID, attr); err != nil {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}

	sentinel.Status.ID = lo.ToPtr(existingSentinel.ID)
	sentinel.Status.SHA = lo.ToPtr(sha)

	utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(sentinel.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return sentinel.Spec.Reconciliation.Requeue(), nil
}

func (r *SentinelReconciler) sync(ctx context.Context, sentinel *v1alpha1.Sentinel, attr *console.SentinelAttributes) (*console.SentinelFragment, error) {
	if sentinel.Status.HasID() {
		return r.ConsoleClient.GetSentinel(ctx, sentinel.Status.GetID())
	}

	return r.ConsoleClient.CreateSentinel(ctx, attr)
}

func (r *SentinelReconciler) attributes(ctx context.Context, sentinel *v1alpha1.Sentinel, repositoryId *string, project *v1alpha1.Project) (*console.SentinelAttributes, error) {
	attr := &console.SentinelAttributes{
		Name:        lo.ToPtr(sentinel.ConsoleName()),
		Description: sentinel.Spec.Description,
		Crontab:     sentinel.Spec.Crontab,
	}
	if repositoryId != nil {
		attr.RepositoryID = repositoryId
	}
	if project.Status.HasID() {
		attr.ProjectID = lo.ToPtr(project.Status.GetID())
	}

	checkAttr, err := r.getSentinelCheckAttributes(ctx, sentinel)
	if err != nil {
		return nil, err
	}
	attr.Checks = checkAttr

	attr.Git = r.getGitAttributes(sentinel)

	return attr, nil
}

func (r *SentinelReconciler) getSentinelCheckAttributes(ctx context.Context, sentinel *v1alpha1.Sentinel) ([]*console.SentinelCheckAttributes, error) {
	if len(sentinel.Spec.Checks) == 0 {
		return nil, nil
	}
	checks := make([]*console.SentinelCheckAttributes, len(sentinel.Spec.Checks))
	for i, check := range sentinel.Spec.Checks {
		checks[i] = &console.SentinelCheckAttributes{
			Type:     check.Type,
			Name:     check.Name,
			RuleFile: check.RuleFile,
		}
		if check.Configuration != nil {
			configuration, err := r.buildCheckConfiguration(ctx, sentinel, check.Configuration)
			if err != nil {
				return nil, err
			}
			checks[i].Configuration = configuration
		}
	}

	return checks, nil
}

func (r *SentinelReconciler) buildCheckConfiguration(ctx context.Context, sentinel *v1alpha1.Sentinel, config *v1alpha1.SentinelCheckConfiguration) (*console.SentinelCheckConfigurationAttributes, error) {
	configuration := &console.SentinelCheckConfigurationAttributes{}

	if config.Log != nil {
		logConfig, err := r.buildLogConfiguration(ctx, config.Log)
		if err != nil {
			return nil, err
		}
		configuration.Log = logConfig
	}

	if config.Kubernetes != nil {
		k8sConfig, err := r.buildKubernetesConfiguration(ctx, config.Kubernetes)
		if err != nil {
			return nil, err
		}
		configuration.Kubernetes = k8sConfig
	}

	if config.IntegrationTest != nil {
		integrationTestConfig, err := r.buildIntegrationTestConfiguration(ctx, sentinel, config.IntegrationTest)
		if err != nil {
			return nil, err
		}
		configuration.IntegrationTest = integrationTestConfig
	}

	return configuration, nil
}

func (r *SentinelReconciler) buildLogConfiguration(ctx context.Context, log *v1alpha1.SentinelCheckLogConfiguration) (*console.SentinelCheckLogConfigurationAttributes, error) {
	logConfig := &console.SentinelCheckLogConfigurationAttributes{
		Namespaces: log.Namespaces,
		Query:      log.Query,
		Duration:   log.Duration,
	}

	if len(log.Facets) > 0 {
		logConfig.Facets = make([]*console.LogFacetInput, 0, len(log.Facets))
		for k, v := range log.Facets {
			logConfig.Facets = append(logConfig.Facets, &console.LogFacetInput{
				Key:   k,
				Value: v,
			})
		}
	}

	if log.ClusterRef != nil {
		helper := utils.NewConsoleHelper(ctx, r.Client)
		clusterID, err := helper.IDFromRef(log.ClusterRef, &v1alpha1.Cluster{})
		if err != nil {
			return nil, err
		}
		logConfig.ClusterID = clusterID
	}

	return logConfig, nil
}

func (r *SentinelReconciler) buildKubernetesConfiguration(ctx context.Context, k8s *v1alpha1.SentinelCheckKubernetesConfiguration) (*console.SentinelCheckKubernetesConfigurationAttributes, error) {
	k8sConfig := &console.SentinelCheckKubernetesConfigurationAttributes{
		Group:     k8s.Group,
		Version:   k8s.Version,
		Kind:      k8s.Kind,
		Name:      k8s.Name,
		Namespace: k8s.Namespace,
	}

	helper := utils.NewConsoleHelper(ctx, r.Client)
	clusterID, err := helper.IDFromRef(&k8s.ClusterRef, &v1alpha1.Cluster{})
	if err != nil {
		return nil, err
	}
	k8sConfig.ClusterID = lo.FromPtr(clusterID)

	return k8sConfig, nil
}

func (r *SentinelReconciler) buildIntegrationTestConfiguration(ctx context.Context, sentinel *v1alpha1.Sentinel, integrationTest *v1alpha1.SentinelCheckIntegrationTestConfiguration) (*console.SentinelCheckIntegrationTestConfigurationAttributes, error) {
	config := &console.SentinelCheckIntegrationTestConfigurationAttributes{
		Distro: integrationTest.Distro,
		Format: integrationTest.Format,
	}

	if integrationTest.Gotestsum != nil {
		config.Gotestsum = &console.SentinelCheckGotestsumAttributes{
			P:        integrationTest.Gotestsum.P,
			Parallel: integrationTest.Gotestsum.Parallel,
		}
	}

	if integrationTest.Job != nil {
		jobSpec, err := common.GateJobAttributes(integrationTest.Job)
		if err != nil {
			return nil, err
		}
		config.Job = jobSpec
	}

	if len(integrationTest.Tags) > 0 {
		jsonTags, err := json.Marshal(integrationTest.Tags)
		if err != nil {
			return nil, err
		}
		config.Tags = lo.ToPtr(string(jsonTags))
	}

	if integrationTest.RepositoryRef != nil {
		repositoryID, err := r.getRepositoryID(ctx, sentinel, integrationTest.RepositoryRef)
		if err != nil {
			return nil, err
		}
		config.RepositoryID = repositoryID
	}

	if integrationTest.Git.HasUrl() {
		id, err := plural.Cache().GetGitRepoID(lo.FromPtr(integrationTest.Git.Url))
		if err != nil {
			return nil, err
		}
		config.RepositoryID = id
	}

	if integrationTest.Git != nil {
		config.Git = &console.GitRefAttributes{
			Ref:    integrationTest.Git.Ref,
			Folder: integrationTest.Git.Folder,
		}
	}

	if len(integrationTest.Cases) > 0 {
		cases, err := r.buildIntegrationTestCases(integrationTest.Cases)
		if err != nil {
			return nil, err
		}
		config.Cases = cases
	}

	return config, nil
}

func (r *SentinelReconciler) getRepositoryID(ctx context.Context, sentinel *v1alpha1.Sentinel, repositoryRef *corev1.ObjectReference) (*string, error) {
	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: repositoryRef.Name, Namespace: repositoryRef.Namespace}, repository); err != nil {
		return nil, ErrGetRepository
	}
	if !repository.Status.HasID() {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
		return nil, ErrWaitRepository
	}
	if repository.Status.Health == v1alpha1.GitHealthFailed {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not healthy")
		return nil, ErrWaitRepository
	}
	return repository.Status.ID, nil
}

func (r *SentinelReconciler) buildIntegrationTestCases(cases []v1alpha1.SentinelCheckIntegrationTestCase) ([]*console.SentinelCheckIntegrationTestCaseAttributes, error) {
	result := make([]*console.SentinelCheckIntegrationTestCaseAttributes, len(cases))
	for j, c := range cases {
		caseAttr := &console.SentinelCheckIntegrationTestCaseAttributes{
			Type: c.Type,
			Name: c.Name,
		}

		if c.Raw != nil {
			caseAttr.Raw = &console.SentinelCheckIntegrationTestCaseRawAttributes{
				Yaml:           string(c.Raw.Yaml.Raw),
				ExpectedResult: c.Raw.ExpectedResult,
			}
		}

		if c.Coredns != nil {
			caseAttr.Coredns = &console.SentinelCheckIntegrationTestCaseCorednsAttributes{
				DialFqdns: lo.ToSlicePtr(c.Coredns.DialFqdns),
				Delay:     c.Coredns.Delay,
				Retries:   c.Coredns.Retries,
			}
		}

		if c.PVC != nil {
			caseAttr.Pvc = &console.SentinelCheckIntegrationTestCasePvcAttributes{
				NamePrefix:   c.PVC.NamePrefix,
				Size:         c.PVC.Size,
				StorageClass: c.PVC.StorageClass,
			}
		}

		if c.Loadbalancer != nil {
			lbAttr, err := r.buildLoadbalancerTestCaseAttributes(c.Loadbalancer)
			if err != nil {
				return nil, err
			}
			caseAttr.Loadbalancer = lbAttr
		}

		result[j] = caseAttr
	}
	return result, nil
}

func (r *SentinelReconciler) buildLoadbalancerTestCaseAttributes(lb *v1alpha1.SentinelCheckIntegrationTestCaseLoadbalancer) (*console.SentinelCheckIntegrationTestCaseLoadbalancerAttributes, error) {
	lbAttr := &console.SentinelCheckIntegrationTestCaseLoadbalancerAttributes{
		Namespace:  lb.Namespace,
		NamePrefix: lb.NamePrefix,
	}

	if len(lb.Labels) > 0 {
		jsonLabels, err := json.Marshal(lb.Labels)
		if err != nil {
			return nil, err
		}
		lbAttr.Labels = lo.ToPtr(string(jsonLabels))
	}

	if len(lb.Annotations) > 0 {
		jsonAnnotations, err := json.Marshal(lb.Annotations)
		if err != nil {
			return nil, err
		}
		lbAttr.Annotations = lo.ToPtr(string(jsonAnnotations))
	}

	if lb.DNSProbe != nil {
		lbAttr.DNSProbe = &console.SentinelCheckIntegrationTestCaseDNSProbeAttributes{
			Fqdn:    lb.DNSProbe.Fqdn,
			Delay:   lb.DNSProbe.Delay,
			Retries: lb.DNSProbe.Retries,
		}
	}

	return lbAttr, nil
}

func (r *SentinelReconciler) getGitAttributes(sentinel *v1alpha1.Sentinel) *console.GitRefAttributes {
	if sentinel.Spec.Git == nil {
		return nil
	}

	git := &console.GitRefAttributes{
		Ref:    sentinel.Spec.Git.Ref,
		Folder: sentinel.Spec.Git.Folder,
	}

	return git
}

func (r *SentinelReconciler) addOrRemoveFinalizer(ctx context.Context, sentinel *v1alpha1.Sentinel) *ctrl.Result {
	// If the service is not being deleted and if it does not have the finalizer, then let's add it.
	if sentinel.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(sentinel, SentinelFinalizer) {
		controllerutil.AddFinalizer(sentinel, SentinelFinalizer)
	}

	// If the service is being deleted, cleanup and remove the finalizer.
	if !sentinel.DeletionTimestamp.IsZero() {
		// If the service does not have an ID, the finalizer can be removed.
		if !sentinel.Status.HasID() {
			controllerutil.RemoveFinalizer(sentinel, SentinelFinalizer)
			return &ctrl.Result{}
		}

		exists, err := r.ConsoleClient.IsSentinelExists(ctx, sentinel.Status.GetID())
		if err != nil {
			return lo.ToPtr(sentinel.Spec.Reconciliation.Requeue())
		}
		if exists {
			if err := r.ConsoleClient.DeleteSentinel(ctx, sentinel.Status.GetID()); err != nil {
				utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}
			}
			// If the deletion process started requeue so that we can make sure the service
			// has been deleted from Console API before removing the finalizer.
			return lo.ToPtr(common.Wait())
		}
		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(sentinel, SentinelFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *SentinelReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ServiceDeploymentList))). // Reconcile objects on credentials change.
		For(&v1alpha1.Sentinel{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
