package ping

import (
	"fmt"
	"time"

	apiextensionsclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/kubectl/pkg/cmd/util"
	ctrclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
	"github.com/pluralsh/console/go/polly/containers"
)

// defaultInsightGracePeriod is how long a recovered component is still reported unless configured otherwise.
const defaultInsightGracePeriod = 10 * time.Minute

type Pinger struct {
	consoleClient   client.Client
	discoveryCache  discoverycache.Cache
	factory         util.Factory
	k8sClient       ctrclient.Client
	clientset       *kubernetes.Clientset
	apiExtClient    *apiextensionsclient.Clientset
	store           store.Store
	supportedAddons containers.Set[string]
	grace           *graceWindow
	priorities      *insightpriority.Evaluator
}

// Option configures a Pinger.
type Option func(*Pinger)

// WithInsightPriorities lets CustomInsightPriority scripts decide the priority of failing components.
func WithInsightPriorities(evaluator *insightpriority.Evaluator) Option {
	return func(p *Pinger) {
		p.priorities = evaluator
	}
}

// WithInsightGracePeriod sets how long a recovered component is still reported as an insight, zero disables it.
func WithInsightGracePeriod(period time.Duration) Option {
	return func(p *Pinger) {
		p.grace = newGraceWindow(period)
	}
}

var supported = []string{
	"argo-cd",
	"argo-rollouts",
	"aws-ebs-csi-driver",
	"aws-efs-csi-driver",
	"aws-load-balancer-controller",
	"amazon-vpc-cni-k8s",
	"calico",
	"cert-manager",
	"cilium",
	"contour",
	"coredns",
	"external-dns",
	"flux",
	"ingress-nginx",
	"istio",
	"jaeger",
	"karpenter",
	"keda",
	"kube-prometheus-stack",
	"kyverno",
	"linkerd",
	"opentelemetry-operator",
	"rook",
	"strimzi-kafka",
	"traefik",
	"velero",
	"vitess",
	"gatekeeper",
	"tigera-operator",
	"argo-cd",
	"vector",
}

func NewOrDie(console client.Client, config *rest.Config, k8sClient ctrclient.Client, discoveryCache discoverycache.Cache, store store.Store, options ...Option) *Pinger {
	pinger, err := New(console, config, k8sClient, discoveryCache, store, options...)
	if err != nil {
		panic(fmt.Errorf("failed to create Pinger: %w", err))
	}
	return pinger
}

func New(console client.Client, config *rest.Config, k8sClient ctrclient.Client, discoveryCache discoverycache.Cache, store store.Store, options ...Option) (*Pinger, error) {
	f := utils.NewFactory(config)
	cs, err := f.KubernetesClientSet()
	if err != nil {
		return nil, err
	}
	apiExtClient, err := apiextensionsclient.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	supportedAddons := containers.NewSet[string]()
	for _, service := range supported {
		supportedAddons.Add(service)
	}

	if myCluster, err := console.MyCluster(); err == nil && myCluster != nil && myCluster.MyCluster != nil {
		for _, addon := range myCluster.MyCluster.SupportedAddons {
			if addon != nil {
				supportedAddons.Add(*addon)
			}
		}
	}

	pinger := &Pinger{
		consoleClient:   console,
		factory:         f,
		k8sClient:       k8sClient,
		clientset:       cs,
		apiExtClient:    apiExtClient,
		discoveryCache:  discoveryCache,
		store:           store,
		supportedAddons: supportedAddons,
		grace:           newGraceWindow(defaultInsightGracePeriod),
	}
	for _, option := range options {
		option(pinger)
	}

	return pinger, nil
}
