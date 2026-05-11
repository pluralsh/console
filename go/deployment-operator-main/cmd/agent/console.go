package main

import (
	"os"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"

	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	"github.com/pluralsh/deployment-operator/internal/utils"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/client"
	consolectrl "github.com/pluralsh/deployment-operator/pkg/controller"
	"github.com/pluralsh/deployment-operator/pkg/controller/stacks"
	v1 "github.com/pluralsh/deployment-operator/pkg/controller/v1"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"

	ctrclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/deployment-operator/pkg/controller/namespaces"
	"github.com/pluralsh/deployment-operator/pkg/controller/pipelinegates"
	"github.com/pluralsh/deployment-operator/pkg/controller/restore"
	"github.com/pluralsh/deployment-operator/pkg/controller/sentinel"
	"github.com/pluralsh/deployment-operator/pkg/controller/service"
)

func initConsoleManagerOrDie() *consolectrl.Manager {
	mgr, err := consolectrl.NewControllerManager(
		consolectrl.WithMaxConcurrentReconciles(args.MaxConcurrentReconciles()),
		consolectrl.WithCacheSyncTimeout(args.ProcessingTimeout()),
		consolectrl.WithPollInterval(args.PollInterval()),
		consolectrl.WithJitter(args.PollJitter()),
		consolectrl.WithRecoverPanic(true),
		consolectrl.WithConsoleClientArgs(args.ConsoleUrl(), args.DeployToken()),
		consolectrl.WithSocketArgs(args.ClusterId(), args.ConsoleUrl(), args.DeployToken()),
	)
	if err != nil {
		setupLog.Error(err, "unable to create manager")
		os.Exit(1)
	}

	return mgr
}

const (
	// Use custom (short) poll intervals for these reconcilers.
	stacksPollInterval   = 30 * time.Second
	sentinelPollInterval = 30 * time.Second
)

func registerConsoleReconcilersOrDie(
	mgr *consolectrl.Manager,
	mapper meta.RESTMapper,
	clientSet kubernetes.Interface,
	k8sClient ctrclient.Client,
	dynamicClient dynamic.Interface,
	store store.Store,
	scheme *runtime.Scheme,
	consoleClient client.Client,
	supervisor *streamline.Supervisor,
	discoveryCache discoverycache.Cache,
	namespaceCache streamline.NamespaceCache,
	svcCache *cache.Cache[console.ServiceDeploymentForAgent],
) {
	mgr.AddReconcilerOrDie(service.Identifier, func() (v1.Reconciler, error) {
		r, err := service.NewServiceReconciler(consoleClient,
			k8sClient,
			mapper,
			clientSet,
			dynamicClient,
			discoveryCache,
			namespaceCache,
			svcCache,
			store,
			service.WithManifestTTL(args.ManifestCacheTTL()),
			service.WithManifestTTLJitter(args.ManifestCacheJitter()),
			service.WithWorkqueueBaseDelay(args.WorkqueueBaseDelay()),
			service.WithWorkqueueMaxDelay(args.WorkqueueMaxDelay()),
			service.WithWorkqueueQPS(args.WorkqueueQPS()),
			service.WithWorkqueueBurst(args.WorkqueueBurst()),
			service.WithRestoreNamespace(args.RestoreNamespace()),
			service.WithConsoleURL(args.ConsoleUrl()),
			service.WithPollInterval(args.PollInterval()),
			service.WithWaveDelay(args.ApplierWaveDelay()),
			service.WithWaveDeQueueDelay(args.WaveDeQueueDelay()),
			service.WithWaveMaxConcurrentApplies(args.WaveMaxConcurrentApplies()),
			service.WithSupervisor(supervisor))
		return r, err
	})

	mgr.AddReconcilerOrDie(pipelinegates.Identifier, func() (v1.Reconciler, error) {
		r, err := pipelinegates.NewGateReconciler(consoleClient, k8sClient, args.PipelineGatesInterval())
		return r, err
	})

	mgr.AddReconcilerOrDie(restore.Identifier, func() (v1.Reconciler, error) {
		r := restore.NewRestoreReconciler(consoleClient, k8sClient, args.ControllerCacheTTL(), args.PollInterval(), args.RestoreNamespace())
		return r, nil
	})

	mgr.AddReconcilerOrDie(namespaces.Identifier, func() (v1.Reconciler, error) {
		r := namespaces.NewNamespaceReconciler(consoleClient, k8sClient, args.ControllerCacheTTL(), args.PollInterval())
		return r, nil
	})

	mgr.AddReconcilerOrDie(stacks.Identifier, func() (v1.Reconciler, error) {
		namespace, err := utils.GetOperatorNamespace()
		if err != nil {
			setupLog.Error(err, "unable to get operator namespace")
			os.Exit(1)
		}

		r := stacks.NewStackReconciler(consoleClient, k8sClient, scheme, args.ControllerCacheTTL(), stacksPollInterval, namespace, args.ConsoleUrl(), args.DeployToken())
		return r, nil
	})

	mgr.AddReconcilerOrDie(sentinel.Identifier, func() (v1.Reconciler, error) {
		namespace, err := utils.GetOperatorNamespace()
		if err != nil {
			setupLog.Error(err, "unable to get operator namespace")
			os.Exit(1)
		}
		r := sentinel.NewSentinelReconciler(namespaceCache, consoleClient, k8sClient, scheme, args.ControllerCacheTTL(), sentinelPollInterval, namespace, args.ConsoleUrl(), args.DeployToken())
		return r, nil
	})
}
