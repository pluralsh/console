package main

import (
	"context"
	"fmt"
	"os"
	"time"

	console "github.com/pluralsh/console/go/client"
	appsv1 "k8s.io/api/apps/v1"
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
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	pollycache "github.com/pluralsh/console/go/polly/cache"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/discovery"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/klog/v2"
	clusterv1 "sigs.k8s.io/cluster-api/api/core/v1beta2"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache"
	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache/persist"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/ping"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scraper"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	deploymentsv1alpha1 "github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/cmd/agent/args"
	consolectrl "github.com/pluralsh/console/go/deployment-operator/pkg/controller"
	"github.com/pluralsh/console/go/deployment-operator/pkg/controller/namespaces"
	"github.com/pluralsh/console/go/deployment-operator/pkg/controller/service"
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
	httpClientTimout                      = time.Second * 5
	existingOperatorInitialPollDeferAfter = time.Hour
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

	// Apply AgentConfiguration before initializing caches. Direct apiserver load is
	// sufficient for startup; the kube reconciler continues to own live updates afterward.
	loadAgentConfigurationOrDie(ctx, kubeManager.GetAPIReader())
	if err := deferPollOnInstall(ctx, kubeManager.GetAPIReader(), args.DeferPollOnInstall(), time.Now()); err != nil {
		setupLog.Error(err, "unable to determine deployment operator age for initial poll")
	}

	// Start the discovery cache manager in background.
	runDiscoveryManagerOrDie(ctx, discoveryCache)

	// Initialize Pipeline Gate Cache
	cache.InitGateCache(args.ControllerCacheTTL(), extConsoleClient)
	componentShaCacheTTL := func() time.Duration {
		return *common.GetConfigurationManager().GetComponentShaCacheTTL()
	}
	cache.InitComponentShaCacheWithExpiryFunc(componentShaCacheTTL)

	dbStore := initDatabaseStoreOrDie(ctx)
	defer func(dbStore store.Store) {
		err := dbStore.Shutdown()
		if err != nil {
			setupLog.Error(err, "unable to shutdown database store")
		}
	}(dbStore)
	streamline.InitGlobalStore(dbStore)

	runStoreCleanerInBackgroundOrDie(ctx, dbStore, args.StoreCleanerInterval(), args.StoreEntryTTL())

	statusSynchronizer := streamline.NewStatusSynchronizerWithCacheTTLFunc(extConsoleClient, componentShaCacheTTL)

	svcCache := pollycache.NewDynamicCache[console.ServiceDeploymentForAgent](
		service.ControllerCacheTTLFunc(args.ControllerCacheTTL(), args.PollInterval()),
		func(id string) (*console.ServiceDeploymentForAgent, error) {
			return extConsoleClient.GetService(id)
		})

	cacheStore, err := persist.Open(args.CacheDir())
	if err != nil {
		setupLog.Error(err, "unable to open cache dir")
		os.Exit(1)
	}
	defer func() {
		if err := cacheStore.Close(); err != nil {
			setupLog.Error(err, "unable to release cache dir lock")
		}
	}()

	// Start synchronizer supervisor
	supervisor := runSynchronizerSupervisorOrDie(ctx, dynamicClient, dbStore, statusSynchronizer, discoveryCache, namespaceCache, svcCache)
	defer supervisor.Stop()

	userGroupCache := cache.NewUserGroupCache(extConsoleClient)

	registerConsoleReconcilersOrDie(consoleManager, mapper, clientSet, kubeManager.GetClient(), dynamicClient, dbStore, kubeManager.GetScheme(), extConsoleClient, supervisor, discoveryCache, namespaceCache, svcCache, cacheStore.Dir())
	registerKubeReconcilersOrDie(ctx, clientSet, kubeManager, consoleManager, config, extConsoleClient, discoveryCache, args.EnableKubecostProxy(), args.ConsoleUrl(), args.DeployToken(), userGroupCache)

	svcReconciler := consoleManager.GetReconcilerOrDie(service.Identifier).(*service.ServiceReconciler)
	nsReconciler := consoleManager.GetReconcilerOrDie(namespaces.Identifier).(*namespaces.NamespaceReconciler)
	saveCaches := func() error {
		userIDs, groupIDs := persist.IdentityRecordsFrom(userGroupCache)
		return cacheStore.Save(persist.Snapshot{
			Manifests:         svcReconciler.ManifestCache().Export(),
			ComponentSHAs:     persist.SHARecordsFrom(cache.ComponentShaCache()),
			StatusSHAs:        persist.SHARecordsFrom(statusSynchronizer.SHACache()),
			UserIDs:           userIDs,
			GroupIDs:          groupIDs,
			ManagedNamespaces: persist.PollyRecordsFrom(nsReconciler.NamespaceCache()),
		})
	}
	if snap, err := cacheStore.Load(); err != nil {
		setupLog.Error(err, "unable to load durable cache, starting cold")
	} else {
		svcReconciler.ManifestCache().Import(snap.Manifests)
		persist.ApplySHARecords(cache.ComponentShaCache(), snap.ComponentSHAs)
		persist.ApplySHARecords(statusSynchronizer.SHACache(), snap.StatusSHAs)
		persist.ApplyIdentityRecords(userGroupCache, snap.UserIDs, snap.GroupIDs)
		persist.ApplyPollyRecords(nsReconciler.NamespaceCache(), snap.ManagedNamespaces)
	}
	cacheStore.StartPeriodic(ctx, args.CachePersistInterval(), saveCaches)

	//+kubebuilder:scaffold:builder

	// Start the metrics scarper in background.
	scraper.RunMetricsScraperInBackgroundOrDie(ctx, kubeManager.GetClient(), discoveryCache, config)

	go runKubeManagerOrDie(ctx, kubeManager)

	// Start the console manager in background.
	runConsoleManagerInBackgroundOrDie(ctx, consoleManager)

	pinger := ping.NewOrDie(extConsoleClient, config, kubeManager.GetClient(), discoveryCache, dbStore)

	// Start cluster pinger
	ping.RunClusterPingerInBackgroundOrDie(ctx, pinger, args.ClusterPingInterval())

	// Start runtime services pinger
	ping.RunRuntimeServicePingerInBackgroundOrDie(ctx, pinger, args.RuntimeServicesPingInterval())

	// Block the main thread until context cancel.
	<-ctx.Done()
	setupLog.Info("shutting down")
	if err := saveCaches(); err != nil {
		setupLog.Error(err, "unable to persist cache snapshot")
	}
}

func loadAgentConfigurationOrDie(ctx context.Context, reader ctrlclient.Reader) {
	if err := loadAgentConfiguration(ctx, reader, args.AgentConfigurationDefaults()); err != nil {
		setupLog.Error(err, "unable to load agent configuration")
		os.Exit(1)
	}
}

func loadAgentConfiguration(ctx context.Context, reader ctrlclient.Reader, defaults deploymentsv1alpha1.AgentConfigurationSpec) error {
	if err := common.GetConfigurationManager().SetDefaults(defaults); err != nil {
		return fmt.Errorf("set agent configuration defaults: %w", err)
	}

	config := &deploymentsv1alpha1.AgentConfiguration{}
	if err := reader.Get(ctx, ctrlclient.ObjectKey{Name: "default"}, config); err != nil {
		if apierrors.IsNotFound(err) {
			setupLog.Info("AgentConfiguration/default not found, using flag defaults")
			return nil
		}

		return fmt.Errorf("fetch AgentConfiguration/default: %w", err)
	}

	if err := common.GetConfigurationManager().SetValue(config.Spec); err != nil {
		return fmt.Errorf("set AgentConfiguration/default: %w", err)
	}

	return nil
}

func deferPollOnInstall(ctx context.Context, reader ctrlclient.Reader, enabled bool, now time.Time) error {
	if !enabled {
		return nil
	}

	namespace, err := utils.GetOperatorNamespace()
	if err != nil {
		return fmt.Errorf("get operator namespace: %w", err)
	}

	deployment := &appsv1.Deployment{}
	if err := reader.Get(ctx, ctrlclient.ObjectKey{Name: "deployment-operator", Namespace: namespace}, deployment); err != nil {
		return fmt.Errorf("get deployment-operator deployment: %w", err)
	}

	if !deployment.CreationTimestamp.IsZero() && now.Sub(deployment.CreationTimestamp.Time) > existingOperatorInitialPollDeferAfter {
		common.GetConfigurationManager().SetPollImmediately(false)
		setupLog.Info("deferring initial poll for existing deployment operator", "age", now.Sub(deployment.CreationTimestamp.Time))
	}

	return nil
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
	namespaceCache streamline.NamespaceCache, svcCache pollycache.Store[console.ServiceDeploymentForAgent]) *streamline.Supervisor {
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
