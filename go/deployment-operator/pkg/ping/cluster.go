package ping

import (
	"context"
	"fmt"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/common"

	"github.com/Masterminds/semver/v3"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	internallog "github.com/pluralsh/deployment-operator/pkg/log"
)

func RunClusterPingerInBackgroundOrDie(ctx context.Context, pinger *Pinger, duration time.Duration) {
	interval := func() time.Duration {
		if clusterPingInterval := common.GetConfigurationManager().GetClusterPingInterval(); clusterPingInterval != nil && *clusterPingInterval > 0 {
			duration = *clusterPingInterval
		}
		return duration
	}

	_ = helpers.DynamicBackgroundPollUntilContextCancel(ctx, interval, false, func(_ context.Context) (done bool, err error) {
		if err := pinger.PingCluster(); err != nil {
			klog.ErrorS(err, "failed ping cluster")
		}
		return false, nil
	})

	klog.V(internallog.LogLevelDefault).InfoS("started cluster pinger", "interval", duration)
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

	attrs := p.pingAttributes(info, podNames, minKubeletVersion, openShiftVersion, podCount)
	attrs.AvailabilityZones = stabilize(azs)
	if err := p.consoleClient.PingCluster(attrs); err != nil {
		attrs.Distro = nil
		return p.consoleClient.PingCluster(attrs) // fallback to no distro to support old console servers
	}

	return nil
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
