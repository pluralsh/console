package ping

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	internallog "github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/polly/containers"
)

// RunClusterPingerInBackgroundOrDie pings the cluster every interval. The first ping waits for ready, which should return
// once the store holds the state of the cluster: a ping built from a partially loaded store would report healthy
// workloads as missing and drop their insights in Console. Nothing else is held back by it.
func RunClusterPingerInBackgroundOrDie(ctx context.Context, pinger *Pinger, duration time.Duration, ready func(context.Context) error) {
	interval := func() time.Duration {
		return clusterPingInterval(duration)
	}

	go func() {
		start := time.Now()
		if err := ready(ctx); err != nil {
			klog.V(internallog.LogLevelDefault).InfoS("cluster pinger stopped before the store was ready", "reason", err)
			return
		}
		klog.V(internallog.LogLevelDefault).InfoS("store is ready, starting cluster pinger", "waited", time.Since(start))

		_ = helpers.DynamicBackgroundPollUntilContextCancel(ctx, interval, false, func(_ context.Context) (done bool, err error) {
			if err := pinger.PingCluster(); err != nil {
				klog.ErrorS(err, "failed ping cluster")
			}
			return false, nil
		})

		klog.V(internallog.LogLevelDefault).InfoS("started cluster pinger", "interval", duration)
	}()
}

func clusterPingInterval(defaultDuration time.Duration) time.Duration {
	if clusterPingInterval := common.GetConfigurationManager().GetClusterPingInterval(); clusterPingInterval != nil {
		return *clusterPingInterval
	}
	return defaultDuration
}

func (p *Pinger) PingCluster() error {
	info := p.discoveryCache.ServerVersion()
	if info == nil {
		return fmt.Errorf("failed to get server version")
	}

	var podNames []string
	var podCount *int64
	// can find some distro information by checking what's running in kube-system
	if pods, err := p.clientset.CoreV1().Pods("kube-system").List(context.Background(), metav1.ListOptions{}); err == nil {
		podNames = lo.Map(pods.Items, func(pod corev1.Pod, ind int) string {
			return pod.Name
		})
	}
	if pods, err := p.clientset.CoreV1().Pods("").List(context.Background(), metav1.ListOptions{}); err == nil {
		podCount = lo.ToPtr(int64(len(pods.Items)))
	}

	minKubeletVersion, azs := p.kubeNodeData()

	var openShiftVersion *string
	apiGroups := p.discoveryCache.GroupVersion().List()
	if common.IsRunningOnOpenShift(apiGroups) {
		version, err := common.GetOpenShiftVersion(p.k8sClient)
		if err == nil {
			openShiftVersion = lo.ToPtr(version)
		}
	}

	attrs, err := p.pingAttributes(info, podNames, minKubeletVersion, openShiftVersion, podCount)
	if err != nil {
		return err
	}
	attrs.AvailabilityZones = stabilize(azs)
	return pingWithFallback(p.consoleClient, attrs)
}

// kubeNodeData tries to scrape a minimum kubelet version across all nodes in the cluster.
// It is expected that the kubelet will report to the API a valid SemVer-ish version.
// If no parsable version is found across all nodes, nil will be returned.
func (p *Pinger) kubeNodeData() (*string, containers.Set[string]) {
	azs := containers.NewSet[string]()
	nodes, err := p.clientset.CoreV1().Nodes().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		klog.ErrorS(err, "failed to list nodes")
		return nil, azs
	}

	minKubeletVersion := new(semver.Version)
	for _, node := range nodes.Items {
		if zone, ok := node.GetLabels()["topology.kubernetes.io/zone"]; ok {
			azs.Add(zone)
		}

		kubeletVersion, _ := semver.NewVersion(node.Status.NodeInfo.KubeletVersion)
		if kubeletVersion == nil {
			continue
		}

		// Initialize with first correctly parsed version
		if len(minKubeletVersion.Original()) == 0 {
			minKubeletVersion = kubeletVersion
			continue
		}

		if kubeletVersion.LessThan(minKubeletVersion) {
			minKubeletVersion = kubeletVersion
		}
	}

	if len(minKubeletVersion.Original()) == 0 {
		return nil, azs
	}

	return lo.ToPtr(minKubeletVersion.Original()), azs
}

func stabilize(azs containers.Set[string]) []*string {
	azsList := azs.List()
	sort.Strings(azsList)
	return lo.ToSlicePtr(azsList)
}

// pingWithFallback pings the cluster and, if that fails, once more without the fields that old Console servers do not
// know. They reject the whole ping for an unknown field, which would also lose the health score.
func pingWithFallback(c client.Client, attrs console.ClusterPing) error {
	if err := c.PingCluster(attrs); err != nil {
		attrs.Distro = nil
		for _, component := range attrs.InsightComponents {
			component.ServiceID = nil
		}
		return c.PingCluster(attrs)
	}

	return nil
}
