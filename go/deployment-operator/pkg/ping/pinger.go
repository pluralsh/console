package ping

import (
	"fmt"

	apiextensionsclient "k8s.io/apiextensions-apiserver/pkg/client/clientset/clientset"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/kubectl/pkg/cmd/util"
	ctrclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/polly/containers"
	"github.com/pluralsh/deployment-operator/internal/utils"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

type Pinger struct {
	consoleClient   client.Client
	discoveryCache  discoverycache.Cache
	factory         util.Factory
	k8sClient       ctrclient.Client
	clientset       *kubernetes.Clientset
	apiExtClient    *apiextensionsclient.Clientset
	store           store.Store
	supportedAddons containers.Set[string]
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

func NewOrDie(console client.Client, config *rest.Config, k8sClient ctrclient.Client, discoveryCache discoverycache.Cache, store store.Store) *Pinger {
	pinger, err := New(console, config, k8sClient, discoveryCache, store)
	if err != nil {
		panic(fmt.Errorf("failed to create Pinger: %w", err))
	}
	return pinger
}

func New(console client.Client, config *rest.Config, k8sClient ctrclient.Client, discoveryCache discoverycache.Cache, store store.Store) (*Pinger, error) {
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

	return &Pinger{
		consoleClient:   console,
		factory:         f,
		k8sClient:       k8sClient,
		clientset:       cs,
		apiExtClient:    apiExtClient,
		discoveryCache:  discoveryCache,
		store:           store,
		supportedAddons: supportedAddons,
	}, nil
}
