package ping

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/scraper"
)

func (p *Pinger) pingAttributes(info *version.Info, pods []string, minKubeletVersion, openShiftVersion *string, podCount *int64) console.ClusterPing {
	hs, err := p.store.GetHealthScore()
	if err != nil {
		klog.ErrorS(err, "failed to get health score")
	}

	ns, err := p.store.GetNodeStatistics()
	if err != nil {
		klog.ErrorS(err, "failed to get node statistics")
	}

	nodCount, namespaceCount, err := p.store.GetComponentCounts()
	if err != nil {
		klog.ErrorS(err, "failed to get cluster component counts")
	}

	vs := strings.Split(info.GitVersion, "-")

	metrics := scraper.GetMetrics().Get()
	distro := findDistro(append(pods, info.GitVersion))
	if openShiftVersion != nil {
		distro = console.ClusterDistroOpenshift
	}

	cp := console.ClusterPing{
		CurrentVersion:   strings.TrimPrefix(vs[0], "v"),
		KubeletVersion:   minKubeletVersion,
		Distro:           lo.ToPtr(distro),
		HealthScore:      &hs,
		NodeCount:        &nodCount,
		PodCount:         podCount,
		NamespaceCount:   &namespaceCount,
		NodeStatistics:   ns,
		OpenshiftVersion: openShiftVersion,
	}

	cInsights, err := p.store.GetComponentInsights()
	if err != nil {
		klog.ErrorS(err, "failed to get component insights")
	}

	cp.InsightComponents = lo.ToSlicePtr(cInsights)
	if metrics.CPUAvailableMillicores > 0 {
		cp.CPUTotal = lo.ToPtr(float64(metrics.CPUAvailableMillicores))
	}
	if metrics.MemoryAvailableBytes > 0 {
		cp.MemoryTotal = lo.ToPtr(float64(metrics.MemoryAvailableBytes))
	}
	if metrics.CPUUsedPercentage > 0 {
		cp.CPUUtil = lo.ToPtr(float64(metrics.CPUUsedPercentage))
	}
	if metrics.MemoryUsedPercentage > 0 {
		cp.MemoryUtil = lo.ToPtr(float64(metrics.MemoryUsedPercentage))
	}

	return cp
}
