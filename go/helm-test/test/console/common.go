package console

import (
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/helm-test/internal/common"
)

// RelativeConsoleChartPath is a relative path from this directory to the console chart.
// Ginkgo always sets working dir to the directory where suite is located.
const RelativeConsoleChartPath = "../../../../charts/console"

type Console struct {
	Deployment common.ManifestKey
	Service    common.ManifestKey
	Ingress    common.ManifestKey
}

type Dashboard struct {
	Deployment common.ManifestKey
	Service    common.ManifestKey
}

type KAS struct {
	Deployment common.ManifestKey
	Service    common.ManifestKey
	Ingress    common.ManifestKey
}

type Operator struct {
	Deployment common.ManifestKey
}

type Redis struct {
	StatefulSet common.ManifestKey
	Service     common.ManifestKey
}

func DefaultResources() struct {
	Console   Console
	Dashboard Dashboard
	Kas       KAS
	Operator  Operator
	Redis     Redis
} {
	return struct {
		Console   Console
		Dashboard Dashboard
		Kas       KAS
		Operator  Operator
		Redis     Redis
	}{
		Console: Console{
			Deployment: common.ManifestKey{
				Name: "console",
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
			Service: common.ManifestKey{
				Name: "console",
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
			Ingress: common.ManifestKey{
				Name: "console",
				GroupKind: schema.GroupKind{
					Group: common.GroupNetworking,
					Kind:  common.KindIngress,
				},
			},
		},
		Dashboard: Dashboard{
			Deployment: common.ManifestKey{
				Name: "console-dashboard-api",
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
			Service: common.ManifestKey{
				Name: "console-dashboard-api",
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
		},
		Kas: KAS{
			Deployment: common.ManifestKey{
				Name: "console-kas",
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
			Service: common.ManifestKey{
				Name: "console-kas-service",
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
			Ingress: common.ManifestKey{
				Name: "console-kas",
				GroupKind: schema.GroupKind{
					Group: common.GroupNetworking,
					Kind:  common.KindIngress,
				},
			},
		},
		Operator: Operator{
			Deployment: common.ManifestKey{
				Name: "console-operator-controller",
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
		},
		Redis: Redis{
			StatefulSet: common.ManifestKey{
				Name: "console-redis-master",
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindStatefulSet,
				},
			},
			Service: common.ManifestKey{
				Name: "console-redis-master",
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
		},
	}
}

func LoadConsoleChart(values map[string]interface{}) (common.ManifestMap, error) {
	klog.Info("Loading console chart")
	chart, err := common.LoadChart(common.WithLocalPath(RelativeConsoleChartPath))
	if err != nil {
		return nil, err
	}

	klog.Info("Rendering console chart")
	manifestList, err := common.RenderChart(chart, values)
	if err != nil {
		return nil, err
	}

	klog.Info("Parsing console chart manifests")
	manifests, err := common.NewManifestMap(manifestList)
	if err != nil {
		return nil, err
	}

	return manifests, nil
}
