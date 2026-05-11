package main

import (
	"context"
	"os"
	"time"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"

	kubernetestrace "github.com/DataDog/dd-trace-go/contrib/k8s.io/client-go/v2/kubernetes"
	datadogtracer "github.com/DataDog/dd-trace-go/v2/ddtrace/tracer"
	datadogprofiler "github.com/DataDog/dd-trace-go/v2/profiler"
	trivy "github.com/aquasecurity/trivy-operator/pkg/apis/aquasecurity/v1alpha1"
	rolloutv1alpha1 "github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	certmanagerv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
	fluxcd "github.com/fluxcd/helm-controller/api/v2"
	templatesv1 "github.com/open-policy-agent/frameworks/constraint/pkg/apis/templates/v1"
	constraintstatusv1beta1 "github.com/open-policy-agent/gatekeeper/v3/apis/status/v1beta1"
	openshift "github.com/openshift/api/config/v1"
	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/pluralsh/deployment-operator/internal/helpers"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/discovery"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/klog/v2"
	clusterv1 "sigs.k8s.io/cluster-api/api/core/v1beta2"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/ping"
	"github.com/pluralsh/deployment-operator/pkg/scraper"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"

	deploymentsv1alpha1 "github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	consolectrl "github.com/pluralsh/deployment-operator/pkg/controller"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = klog.NewKlogr()
)

func init() {
	utilruntime.Must(trivy.AddToScheme(scheme))
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(deploymentsv1alpha1.AddToScheme(scheme))
	utilruntime.Must(velerov1.AddToScheme(scheme))
	utilruntime.Must(apiextensionsv1.AddToScheme(scheme))
	utilruntime.Must(constraintstatusv1beta1.AddToScheme(scheme))
	utilruntime.Must(templatesv1.AddToScheme(scheme))
	utilruntime.Must(rolloutv1alpha1.AddToScheme(scheme))
	utilruntime.Must(certmanagerv1.AddToScheme(scheme))
	utilruntime.Must(openshift.AddToScheme(scheme))
	utilruntime.Must(fluxcd.AddToScheme(scheme))
	utilruntime.Must(clusterv1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

const (
	httpClientTimout = time.Second * 5
)

func main() {
	args.Init()
	config := ctrl.GetConfigOrDie()
	ctx := ctrl.LoggerInto(ctrl.SetupSignalHandler(), setupLog)
	utils.DisableClientLimits(config)

	if args.PyroscopeEnabled() {
		profiler, err := args.InitPyroscope()
		if err != nil {
			setupLog.Error(err, "unable to initialize pyroscope")
			os.Exit(1)
		}

		defer func() {
			_ = profiler.Stop()
		}()
	}

	if args.DatadogEnabled() {
		err := args.InitDatadog()
		if err != nil {
			panic("unable to initialize datadog")
		}

		// Trace kubernetes client calls
		config.WrapTransport = kubernetestrace.WrapRoundTripper

		defer func() {
			datadogtracer.Stop()
			datadogprofiler.Stop()
		}()
	}

	mapper, discoveryClient, clientSet, dynamicClient := initKubeResourcesOrDie(config)

	extConsoleClient := client.New(args.ConsoleUrl(), args.DeployToken())

	// Initialize the discovery cache.
	initDiscoveryCache(discoveryClient, mapper)
	discoveryCache := discoverycache.GlobalCache()
	namespaceCache := streamline.NewNamespaceCache(clientSet)

	kubeManager := initKubeManagerOrDie(config)
	consoleManager := initConsoleManagerOrDie()

	// Start the discovery cache manager in background.
	runDiscoveryManagerOrDie(ctx, discoveryCache)

	// Initialize Pipeline Gate Cache
	cache.InitGateCache(args.ControllerCacheTTL(), extConsoleClient)
	cache.InitComponentShaCache(args.ComponentShaCacheTTL())

	dbStore := initDatabaseStoreOrDie(ctx)
	defer func(dbStore store.Store) {
		err := dbStore.Shutdown()
		if err != nil {
			setupLog.Error(err, "unable to shutdown database store")
		}
	}(dbStore)
	streamline.InitGlobalStore(dbStore)

	runStoreCleanerInBackgroundOrDie(ctx, dbStore, args.StoreCleanerInterval(), args.StoreEntryTTL())

	statusSynchronizer := streamline.NewStatusSynchronizer(extConsoleClient, args.ComponentShaCacheTTL())

	svcCache := pollycache.NewCache[console.ServiceDeploymentForAgent](args.ControllerCacheTTL(),
		func(id string) (*console.ServiceDeploymentForAgent, error) {
			return extConsoleClient.GetService(id)
		})

	// Start synchronizer supervisor
	supervisor := runSynchronizerSupervisorOrDie(ctx, dynamicClient, dbStore, statusSynchronizer, discoveryCache, namespaceCache, svcCache)
	defer supervisor.Stop()

	registerConsoleReconcilersOrDie(consoleManager, mapper, clientSet, kubeManager.GetClient(), dynamicClient, dbStore, kubeManager.GetScheme(), extConsoleClient, supervisor, discoveryCache, namespaceCache, svcCache)
	registerKubeReconcilersOrDie(ctx, clientSet, kubeManager, consoleManager, config, extConsoleClient, discoveryCache, args.EnableKubecostProxy(), args.ConsoleUrl(), args.DeployToken())

	//+kubebuilder:scaffold:builder

	// Start the metrics scarper in background.
	scraper.RunMetricsScraperInBackgroundOrDie(ctx, kubeManager.GetClient(), discoveryCache, config)

	// Start the console manager in background.
	runConsoleManagerInBackgroundOrDie(ctx, consoleManager)

	pinger := ping.NewOrDie(extConsoleClient, config, kubeManager.GetClient(), discoveryCache, dbStore)

	// Start cluster pinger
	ping.RunClusterPingerInBackgroundOrDie(ctx, pinger, args.ClusterPingInterval())

	// Start runtime services pinger
	ping.RunRuntimeServicePingerInBackgroundOrDie(ctx, pinger, args.RuntimeServicesPingInterval())

	// Start the standard kubernetes manager and block the main thread until context cancel.
	runKubeManagerOrDie(ctx, kubeManager)
}

func initKubeResourcesOrDie(config *rest.Config) (meta.RESTMapper, discovery.DiscoveryInterface, kubernetes.Interface, dynamic.Interface) {
	discoveryClient := discovery.NewDiscoveryClientForConfigOrDie(config)

	f := utils.NewFactory(config)
	mapper, err := f.ToRESTMapper()
	if err != nil {
		setupLog.Error(err, "unable to create mapper")
		os.Exit(1)
	}

	clientSet, err := f.KubernetesClientSet()
	if err != nil {
		setupLog.Error(err, "unable to create clientset")
		os.Exit(1)
	}

	dynamicClient, err := f.DynamicClient()
	if err != nil {
		setupLog.Error(err, "unable to create dynamic client")
		os.Exit(1)
	}

	return mapper, discoveryClient, clientSet, dynamicClient
}

func runConsoleManagerInBackgroundOrDie(ctx context.Context, mgr *consolectrl.Manager) {
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "unable to start console controller manager")
		os.Exit(1)
	}
	setupLog.Info("started console controller manager")
}

func runKubeManagerOrDie(ctx context.Context, mgr ctrl.Manager) {
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "unable to start kubernetes controller manager")
		os.Exit(1)
	}
	setupLog.Info("started kubernetes controller manager")
}

func initDiscoveryCache(client discovery.DiscoveryInterface, mapper meta.RESTMapper) {
	discoverycache.InitGlobalDiscoveryCache(client, mapper,
		discoverycache.WithOnGroupVersionAdded(func(gv schema.GroupVersion) {
			discoverycache.UpdateServiceMesh(gv.Group, discoverycache.ServiceMeshUpdateTypeAdded)
		}),
		discoverycache.WithOnGroupVersionDeleted(func(gv schema.GroupVersion) {
			// TODO: consider using just Group deletion event to signal service mesh removal
			// as it may cause issues if a group has multiple versions and only one is removed
			discoverycache.UpdateServiceMesh(gv.Group, discoverycache.ServiceMeshUpdateTypeDeleted)
		}),
	)
}

func runDiscoveryManagerOrDie(ctx context.Context, cache discoverycache.Cache) {
	now := time.Now()
	if err := discoverycache.NewDiscoveryManager(
		discoverycache.WithRefreshInterval(args.DiscoveryCacheRefreshInterval()),
		discoverycache.WithCache(cache),
	).Start(ctx); err != nil {
		setupLog.Error(err, "error starting discovery manager, cache might not be up to date")
		return
	}

	setupLog.Info("discovery manager started with initial cache sync", "duration", time.Since(now))
}

func runSynchronizerSupervisorOrDie(ctx context.Context, dynamicClient dynamic.Interface, store store.Store,
	statusSynchronizer streamline.StatusSynchronizer, discoveryCache discoverycache.Cache,
	namespaceCache streamline.NamespaceCache, svcCache *pollycache.Cache[console.ServiceDeploymentForAgent]) *streamline.Supervisor {
	now := time.Now()
	supervisor := streamline.NewSupervisor(dynamicClient,
		store,
		statusSynchronizer,
		discoveryCache,
		svcCache,
		streamline.WithCacheSyncTimeout(args.SupervisorCacheSyncTimeout()),
		streamline.WithRestartDelay(args.SupervisorRestartDelay()),
		streamline.WithMaxNotFoundRetries(args.SupervisorMaxNotFoundRetries()),
		streamline.WithSynchronizerResyncInterval(args.SupervisorSynchronizerResyncInterval()),
		streamline.WithEventSubscribers(
			schema.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"},
			[]streamline.EventSubscriber{namespaceCache.HandleNamespaceEvent}),
	)
	supervisor.Run(ctx)
	setupLog.Info("waiting for synchronizers cache to sync")
	if err := supervisor.WaitForCacheSync(ctx); err != nil {
		setupLog.Error(err, "could not warmup synchronizers cache")
		return supervisor
	}

	setupLog.Info("started synchronizer supervisor with initial cache sync", "duration", time.Since(now))
	return supervisor
}

func initDatabaseStoreOrDie(ctx context.Context) store.Store {
	dbStore, err := store.NewDatabaseStore(ctx, store.WithStorage(args.StoreStorage()), store.WithFilePath(args.StoreFilePath()))
	if err != nil {
		setupLog.Error(err, "unable to initialize database store")
		os.Exit(1)
	}

	if args.LocalDatabaseProfiler() {
		return store.NewLocalProfiledStore(dbStore)
	}

	if args.DatadogEnabled() {
		return store.NewProfiledStore(dbStore)
	}

	return dbStore
}

func runStoreCleanerInBackgroundOrDie(ctx context.Context, store store.Store, interval, ttl time.Duration) {
	_ = helpers.DynamicBackgroundPollUntilContextCancel(ctx, func() time.Duration { return interval }, false, func(_ context.Context) (done bool, err error) {
		if err := store.ExpireOlderThan(ttl); err != nil {
			klog.ErrorS(err, "unable to expire resource cache")
		}
		return false, nil
	})

	setupLog.Info("store cleaner started", "interval", interval, "ttl", ttl)
}
