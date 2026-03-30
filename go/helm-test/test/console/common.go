package console

import (
	"fmt"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/helm-test/internal/common"
)

// Relative paths from this directory to the charts.
// Ginkgo always sets working dir to the directory where suite is located.
const (
	RelativeConsoleChartPath      = "../../../../charts/console"
	RelativeConsoleRapidChartPath = "../../../../charts/console-rapid"
)

// ChartEntry represents a chart to test.
type ChartEntry struct {
	Name        string
	Path        string
	ReleaseName string
}

// Charts returns all chart variants that should be tested.
func Charts() []ChartEntry {
	return []ChartEntry{
		{Name: "Console", Path: RelativeConsoleChartPath, ReleaseName: "console"},
		{Name: "Console Rapid", Path: RelativeConsoleRapidChartPath, ReleaseName: "console-rapid"},
	}
}

// Resources returns DefaultResources using this chart's release name as prefix.
func (e ChartEntry) Resources() struct {
	Console   Console
	Dashboard Dashboard
	Kas       KAS
	Operator  Operator
	Redis     Redis
} {
	return DefaultResources(e.ReleaseName)
}

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

func DefaultResources(prefix string) struct {
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
				Name: fmt.Sprintf("%s-dashboard-api", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
			Service: common.ManifestKey{
				Name: fmt.Sprintf("%s-dashboard-api", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
		},
		Kas: KAS{
			Deployment: common.ManifestKey{
				Name: fmt.Sprintf("%s-kas-server", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindDeployment,
				},
			},
			Service: common.ManifestKey{
				Name: fmt.Sprintf("%s-kas-service", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
			Ingress: common.ManifestKey{
				Name: fmt.Sprintf("%s-kas", prefix),
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
				Name: fmt.Sprintf("%s-redis-master", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupApps,
					Kind:  common.KindStatefulSet,
				},
			},
			Service: common.ManifestKey{
				Name: fmt.Sprintf("%s-redis-master", prefix),
				GroupKind: schema.GroupKind{
					Group: common.GroupCore,
					Kind:  common.KindService,
				},
			},
		},
	}
}

func (e ChartEntry) Load(values map[string]interface{}) (common.ManifestMap, error) {
	klog.V(common.LogLevel()).Infof("Loading %s chart", e.Name)
	chart, err := common.LoadChart(common.WithLocalPath(e.Path))
	if err != nil {
		return nil, err
	}

	klog.V(common.LogLevel()).Infof("Rendering %s chart", e.Name)
	manifestList, err := common.RenderChart(chart, values)
	if err != nil {
		return nil, err
	}

	klog.V(common.LogLevel()).Infof("Parsing %s chart manifests", e.Name)
	manifests, err := common.NewManifestMap(manifestList)
	if err != nil {
		return nil, err
	}

	return manifests, nil
}
