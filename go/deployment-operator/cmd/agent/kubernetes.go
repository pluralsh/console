package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	trivy "github.com/aquasecurity/trivy-operator/pkg/apis/aquasecurity/v1alpha1"
	"github.com/argoproj/argo-rollouts/pkg/apis/rollouts"
	rolloutv1alpha1 "github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	roclientset "github.com/argoproj/argo-rollouts/pkg/client/clientset/versioned"
	fluxcd "github.com/fluxcd/helm-controller/api/v2"
	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	clientgocache "k8s.io/client-go/tools/cache"
	ctrl "sigs.k8s.io/controller-runtime"
	crcache "sigs.k8s.io/controller-runtime/pkg/cache"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/metrics/server"

	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	"github.com/pluralsh/deployment-operator/internal/controller"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	consoleclient "github.com/pluralsh/deployment-operator/pkg/client"
	consolectrl "github.com/pluralsh/deployment-operator/pkg/controller"
	"github.com/pluralsh/deployment-operator/pkg/controller/service"
)

func emptyDiskHealthCheck(_ *http.Request) error {
	testFile := filepath.Join("/tmp", "healthcheck.tmp")
	data := []byte("ok")
	if err := os.WriteFile(testFile, data, 0644); err != nil {
		return fmt.Errorf("/tmp is not writable: %w", err)
	}
	_ = os.Remove(testFile)
	return nil
}

func initKubeManagerOrDie(config *rest.Config) manager.Manager {
	watchErrHandler := func(ctx context.Context, r *clientgocache.Reflector, err error) {
		switch {
		case apierrors.IsNotFound(err), apierrors.IsGone(err), meta.IsNoMatchError(err):
			setupLog.V(2).Error(err, "ignoring watch error for removed resource")
			return
		default:
			clientgocache.DefaultWatchErrorHandler(ctx, r, err)
		}
	}

	mgr, err := ctrl.NewManager(config, ctrl.Options{
		NewClient:              ctrlclient.New, // client reads directly from the API server
		Logger:                 setupLog,
		Scheme:                 scheme,
		LeaderElection:         args.EnableLeaderElection(),
		Cache:                  crcache.Options{DefaultWatchErrorHandler: watchErrHandler},
		LeaderElectionID:       "dep12loy45.plural.sh",
		HealthProbeBindAddress: args.ProbeAddr(),
		Metrics: server.Options{
			BindAddress: args.MetricsAddr(),
			ExtraHandlers: map[string]http.Handler{
				// Default prometheus metrics path.
				// We can't use /metrics as it is already taken by the
				// controller manager.
				"/metrics/agent": promhttp.Handler(),
			},
		},
	})
	if err != nil {
		setupLog.Error(err, "unable to create manager")
		os.Exit(1)
	}

	if err = mgr.AddHealthzCheck("ping", emptyDiskHealthCheck); err != nil {
		setupLog.Error(err, "unable to create health check")
		os.Exit(1)
	}

	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	return mgr
}

func initKubeClientsOrDie(config *rest.Config) (rolloutsClient *roclientset.Clientset,
	dynamicClient *dynamic.DynamicClient,
	kubeClient *kubernetes.Clientset,
) {
	rolloutsClient, err := roclientset.NewForConfig(config)
	if err != nil {
		setupLog.Error(err, "unable to create rollouts client")
		os.Exit(1)
	}

	dynamicClient, err = dynamic.NewForConfig(config)
	if err != nil {
		setupLog.Error(err, "unable to create dynamic client")
		os.Exit(1)
	}

	kubeClient, err = kubernetes.NewForConfig(config)
	if err != nil {
		setupLog.Error(err, "unable to create kubernetes client")
		os.Exit(1)
	}

	return rolloutsClient, dynamicClient, kubeClient
}

func registerKubeReconcilersOrDie(
	ctx context.Context,
	clientSet kubernetes.Interface,
	manager ctrl.Manager,
	consoleManager *consolectrl.Manager,
	config *rest.Config,
	extConsoleClient consoleclient.Client,
	discoveryCache discoverycache.Cache,
	enableKubecostProxy bool,
	consoleURL, deployToken string,
) {
	rolloutsClient, dynamicClient, kubeClient := initKubeClientsOrDie(config)

	cluster, err := extConsoleClient.MyCluster()
	if err != nil {
		setupLog.Error(err, "unable to get cluster information from console")
		os.Exit(1)
	}

	backupController := &controller.BackupReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
	}
	restoreController := &controller.RestoreReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
	}
	constraintController := &controller.ConstraintReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
		Reader:        manager.GetCache(),
	}
	argoRolloutController := &controller.ArgoRolloutReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
		ConsoleURL:    args.ConsoleUrl(),
		HttpClient:    &http.Client{Timeout: httpClientTimout},
		ArgoClientSet: rolloutsClient,
		DynamicClient: dynamicClient,
		SvcReconciler: consoleManager.GetReconcilerOrDie(service.Identifier),
		KubeClient:    kubeClient,
	}

	vulnerabilityReportController := &controller.VulnerabilityReportReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
		Ctx:           ctx,
	}
	helmReleaseController := &controller.HelmReleaseReconciler{
		Client:    manager.GetClient(),
		Scheme:    manager.GetScheme(),
		ClientSet: clientSet,
	}
	reconcileGroups := map[schema.GroupVersionKind]controller.SetupWithManager{
		{
			Group:   velerov1.SchemeGroupVersion.Group,
			Version: velerov1.SchemeGroupVersion.Version,
			Kind:    "Backup",
		}: backupController.SetupWithManager,
		{
			Group:   velerov1.SchemeGroupVersion.Group,
			Version: velerov1.SchemeGroupVersion.Version,
			Kind:    "Restore",
		}: restoreController.SetupWithManager,
		{
			Group:   "status.gatekeeper.sh",
			Version: "v1beta1",
			Kind:    "ConstraintPodStatus",
		}: constraintController.SetupWithManager,
		{
			Group:   rolloutv1alpha1.SchemeGroupVersion.Group,
			Version: rolloutv1alpha1.SchemeGroupVersion.Version,
			Kind:    rollouts.RolloutKind,
		}: argoRolloutController.SetupWithManager,
		{
			Group:   trivy.SchemeGroupVersion.Group,
			Version: trivy.SchemeGroupVersion.Version,
			Kind:    "VulnerabilityReport",
		}: vulnerabilityReportController.SetupWithManager,
		{
			Group:   fluxcd.GroupVersion.Group,
			Version: fluxcd.GroupVersion.Version,
			Kind:    fluxcd.HelmReleaseKind,
		}: helmReleaseController.SetupWithManager,
	}

	if err := (&controller.CrdRegisterControllerReconciler{
		Client:           manager.GetClient(),
		Scheme:           manager.GetScheme(),
		ReconcilerGroups: reconcileGroups,
		Mgr:              manager,
		DiscoveryCache:   discoveryCache,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "CRDRegisterController")
	}

	if err := (&controller.CustomHealthReconciler{
		Client: manager.GetClient(),
		Scheme: manager.GetScheme(),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "HealthConvert")
	}
	if err := (&controller.StackRunJobReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
		ConsoleURL:    consoleURL,
		DeployToken:   deployToken,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "StackRun")
	}

	if err := (&controller.IngressReplicaReconciler{
		Client: manager.GetClient(),
		Scheme: manager.GetScheme(),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "IngressReplica")
	}

	rawConsoleUrl, _ := strings.CutSuffix(args.ConsoleUrl(), "/ext/gql")
	if err := (&controller.VirtualClusterController{
		Client:           manager.GetClient(),
		Scheme:           manager.GetScheme(),
		ExtConsoleClient: extConsoleClient,
		ConsoleUrl:       rawConsoleUrl,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "VirtualCluster")
	}

	if err := (&controller.UpgradeInsightsController{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "UpgradeInsights")
	}

	if err := (&controller.PipelineGateReconciler{
		Client:        manager.GetClient(),
		ConsoleClient: consoleclient.New(args.ConsoleUrl(), args.DeployToken()),
		Scheme:        manager.GetScheme(),
		GateCache:     cache.GateCache(),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Group")
		os.Exit(1)
	}

	if err := (&controller.MetricsAggregateReconciler{
		Client:         manager.GetClient(),
		Scheme:         manager.GetScheme(),
		DiscoveryCache: discoveryCache,
	}).SetupWithManager(ctx, manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "MetricsAggregate")
	}

	if err := (&controller.KubecostExtractorReconciler{
		Client:           manager.GetClient(),
		Scheme:           manager.GetScheme(),
		KubeClient:       kubeClient,
		ExtConsoleClient: extConsoleClient,
		Tasks:            cmap.New[context.CancelFunc](),
		Proxy:            enableKubecostProxy,
		ServiceIDCache:   controller.NewServiceIDCache(args.KubeCostExtractorCacheTTL()),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "MetricsAggregate")
	}

	if err := (&controller.ClusterDrainReconciler{
		Client: manager.GetClient(),
		Scheme: manager.GetScheme(),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "ClusterDrain")
	}
	if err := (&controller.AgentConfigurationReconciler{
		Client: manager.GetClient(),
		Scheme: manager.GetScheme(),
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AgentConfiguration")
	}

	agentRuntimeReconciler := &controller.AgentRuntimeReconciler{
		Client:           manager.GetClient(),
		Scheme:           manager.GetScheme(),
		ConsoleClient:    extConsoleClient,
		CacheSyncTimeout: args.PollInterval() * 3,
		Ctx:              ctx,
		ClusterID:        cluster.MyCluster.ID,
	}
	if err := agentRuntimeReconciler.SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AgentRuntime")
	}
	consoleManager.Socket.AddPublisher("agent_run", agentRuntimeReconciler)

	if err := (&controller.AgentRunReconciler{
		Client:           manager.GetClient(),
		Scheme:           manager.GetScheme(),
		ConsoleClient:    extConsoleClient,
		ConsoleURL:       consoleURL,
		DeployToken:      deployToken,
		CacheSyncTimeout: args.PollInterval() * 3,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AgentRun")
	}
	if err := (&controller.PluralCAPIClusterController{
		Client:     manager.GetClient(),
		Scheme:     manager.GetScheme(),
		ConsoleUrl: consoleURL,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "PluralCAPIClusterController")
	}
	if err := (&controller.SentinelRunJobReconciler{
		Client:        manager.GetClient(),
		Scheme:        manager.GetScheme(),
		ConsoleClient: extConsoleClient,
		ConsoleURL:    consoleURL,
		DeployToken:   deployToken,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "SentinelRunJob")
	}
}
