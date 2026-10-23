package ping

import (
	"context"
	"fmt"
	"strings"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scraper"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

func (p *Pinger) pingAttributes(info *version.Info, pods []string, minKubeletVersion, openShiftVersion *string, podCount *int64) (console.ClusterPing, error) {
	nodCount, namespaceCount, err := p.store.GetComponentCounts()
	if err != nil {
		klog.ErrorS(err, "failed to get cluster component counts")
	}

	// The health score and the insights are computed from the same failing roots, so they always agree.
	now := time.Now()
	roots, err := p.store.GetFailingRoots()
	if err != nil {
		// An empty list would report a healthy cluster and make Console delete all its insights, so skip this ping.
		return console.ClusterPing{}, fmt.Errorf("failed to get failing components: %w", err)
	}
	var overrides map[string]insights.Override
	if p.priorities != nil {
		overrides = p.priorities.Overrides(context.Background(), roots, insightpriority.Cluster{Nodes: nodCount, Namespaces: namespaceCount}, now)
	}
	summary := insights.Summarize(roots, overrides, now)
	hs := summary.HealthScore

	ns, err := p.store.GetNodeStatistics()
	if err != nil {
		klog.ErrorS(err, "failed to get node statistics")
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

	cp.InsightComponents = lo.ToSlicePtr(insights.Attributes(p.grace.apply(summary, p.store, now)))
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

	return cp, nil
}
