package ping

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/klog/v2"
	runtimecache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	controllerv1 "github.com/pluralsh/deployment-operator/pkg/controller/v1"
	internallog "github.com/pluralsh/deployment-operator/pkg/log"
)

const runtimeServicePingerName = "runtime service pinger"

var componentMappings = map[string]string{
	"argocd":        "argo-cd",
	"keda-operator": "keda",
	"rook-operator": "rook",
}

var (
	componentParseRegex = regexp.MustCompile(`^([^-]+)-([^-]+)$`)
)

func RunRuntimeServicePingerInBackgroundOrDie(ctx context.Context, pinger *Pinger, duration time.Duration) {
	klog.Info("starting ", runtimeServicePingerName)

	interval := func() time.Duration {
		if runtimeServicesPingInterval := common.GetConfigurationManager().GetRuntimeServicesPingInterval(); runtimeServicesPingInterval != nil && *runtimeServicesPingInterval > 0 {
			duration = *runtimeServicesPingInterval
		}
		return duration
	}

	err := helpers.DynamicBackgroundPollUntilContextCancel(ctx, interval, false, func(_ context.Context) (done bool, err error) {
		pinger.PingRuntimeServices(ctx)
		return false, nil
	})
	if err != nil {
		panic(fmt.Errorf("failed to start %s in background: %w", runtimeServicePingerName, err))
	}
}

func (p *Pinger) PingRuntimeServices(ctx context.Context) {
	klog.V(internallog.LogLevelVerbose).Info("attempting to collect all runtime services for the cluster")
	// Pre-allocate map with estimated capacity to avoid reallocations
	runtimeServices := make(map[string]client.NamespaceVersion, 100)
	hasEBPFDaemonSet := false

	components := p.supportedAddons.List()
	klog.V(internallog.LogLevelDebug).Info("aggregating from deployments")
	for _, deployment := range p.deployments(ctx) {
		p.AddRuntimeServiceInfo(deployment.Namespace,
			deployment.GetLabels(),
			runtimeServices,
			p.heuristicVersionSearch(deployment.Spec.Template.Spec, components),
		)
	}

	klog.V(internallog.LogLevelDebug).Info("aggregating from statefulsets")
	for _, ss := range p.statefulSets(ctx) {
		p.AddRuntimeServiceInfo(ss.Namespace,
			ss.GetLabels(),
			runtimeServices,
			p.heuristicVersionSearch(ss.Spec.Template.Spec, components),
		)
	}

	klog.V(internallog.LogLevelDebug).Info("aggregating from daemonsets")
	for _, ds := range p.daemonSets(ctx) {
		p.AddRuntimeServiceInfo(ds.Namespace,
			ds.GetLabels(),
			runtimeServices,
			p.heuristicVersionSearch(ds.Spec.Template.Spec, components),
		)

		if discovery.IsEBPFDaemonSet(ds) {
			hasEBPFDaemonSet = true
		}
	}

	if err := p.consoleClient.RegisterRuntimeServices(runtimeServices, p.GetDeprecatedCustomResources(ctx), nil, discovery.ServiceMesh(hasEBPFDaemonSet)); err != nil {
		klog.ErrorS(err, "failed to register runtime services, this is an ignorable error but could mean your console needs to be upgraded")
	}
}

func (p *Pinger) deployments(ctx context.Context) []appsv1.Deployment {
	deployments, _ := p.clientset.AppsV1().Deployments(runtimecache.AllNamespaces).List(ctx, metav1.ListOptions{})
	return lo.Ternary(deployments == nil, []appsv1.Deployment{}, deployments.Items)
}

func (p *Pinger) statefulSets(ctx context.Context) []appsv1.StatefulSet {
	statefulSets, _ := p.clientset.AppsV1().StatefulSets(runtimecache.AllNamespaces).List(ctx, metav1.ListOptions{})
	return lo.Ternary(statefulSets == nil, []appsv1.StatefulSet{}, statefulSets.Items)
}

func (p *Pinger) daemonSets(ctx context.Context) []appsv1.DaemonSet {
	daemonSets, _ := p.clientset.AppsV1().DaemonSets(runtimecache.AllNamespaces).List(ctx, metav1.ListOptions{})
	return lo.Ternary(daemonSets == nil, []appsv1.DaemonSet{}, daemonSets.Items)
}

type HeuristicVersionSearch func([]string) string

func (p *Pinger) heuristicVersionSearch(spec v1.PodSpec, components []string) HeuristicVersionSearch {
	return func(components []string) string {
		// This can be extended to add more heuristics in the future
		// For now, we only have one heuristic that goes through pod spec.
		return p.podSpecHeuristicVersionSearch(spec, components)
	}
}

func (p *Pinger) podSpecHeuristicVersionSearch(podSpec v1.PodSpec, components []string) string {
	for _, container := range podSpec.Containers {
		for _, component := range components {
			if strings.Contains(container.Image, component) {
				if version := p.extractVersionFromImage(container.Image, component); len(version) > 0 {
					return version
				}
			}
		}
	}

	return ""
}

func (p *Pinger) extractVersionFromImage(image, service string) string {
	serviceLower := strings.ToLower(service)
	imageLower := strings.ToLower(image)

	// Patterns that expect <service>:<version> format
	patterns := []string{
		fmt.Sprintf(`%s:v(\d+\.\d+\.\d+)(?:-[a-zA-Z0-9\.-]+)?`, regexp.QuoteMeta(serviceLower)),
		fmt.Sprintf(`%s:(\d+\.\d+\.\d+)(?:-[a-zA-Z0-9\.-]+)?`, regexp.QuoteMeta(serviceLower)),
		fmt.Sprintf(`%s.*:v(\d+\.\d+\.\d+)(?:-[a-zA-Z0-9\.-]+)?`, regexp.QuoteMeta(serviceLower)),
		fmt.Sprintf(`%s.*:(\d+\.\d+\.\d+)(?:-[a-zA-Z0-9\.-]+)?`, regexp.QuoteMeta(serviceLower)),
	}

	for _, pattern := range patterns {
		if re, err := regexp.Compile(pattern); err == nil {
			if matches := re.FindStringSubmatch(imageLower); len(matches) > 1 {
				return matches[1]
			}
		}
	}

	return ""
}

func (p *Pinger) AddRuntimeServiceInfo(namespace string, labels map[string]string, acc map[string]client.NamespaceVersion, heuristicVersionSearch HeuristicVersionSearch) {
	if labels == nil {
		return
	}

	vsn := labels["app.kubernetes.io/version"]
	serviceName := ""
	partOfName := ""

	labelsToCheck := []string{
		"app.kubernetes.io/name",
		"app.kubernetes.io/instance",
		"app.kubernetes.io/part-of",
		"app",
		"component",
		"k8s-app",
	}
	for _, label := range labelsToCheck {
		if name, ok := p.validLabel(labels, label); ok {
			serviceName = name
			break
		}
	}

	// Get part-of information
	if partOf := labels["app.kubernetes.io/part-of"]; len(partOf) > 0 {
		partOfName = partOf
	}

	if len(vsn) > 0 && len(serviceName) > 0 {
		addServiceEntry(serviceName, vsn, namespace, partOfName, acc)
		return
	}

	components := []string{serviceName}
	if component, ok := componentMappings[serviceName]; ok {
		components = append(components, component)
		serviceName = component
	}

	if len(vsn) == 0 && len(serviceName) > 0 {
		vsn = heuristicVersionSearch(components)
		if len(vsn) > 0 {
			addServiceEntry(serviceName, vsn, namespace, partOfName, acc)
			return
		}
	}
}

func (p *Pinger) validLabel(labels map[string]string, key string) (string, bool) {
	if name, ok := labels[key]; ok && len(name) > 0 {
		name = strings.TrimSpace(strings.ToLower(name))
		for _, name := range nameMappings(name) {
			if p.supportedAddons.Has(name) {
				return name, true
			}

			matches := componentParseRegex.FindStringSubmatch(name)
			if len(matches) == 3 && matches[1] == matches[2] {
				if p.supportedAddons.Has(matches[1]) {
					return matches[1], true
				}
			}
		}
	}
	return "", false
}

func nameMappings(name string) []string {
	results := []string{name}
	if mapped, ok := componentMappings[name]; ok {
		results = append(results, mapped)
	}
	return results
}

func addServiceEntry(serviceName, version, namespace, partOfName string, acc map[string]client.NamespaceVersion) {
	entry := acc[serviceName]

	entry = addVersion(entry, version)
	entry.Namespace = namespace

	if len(entry.PartOf) == 0 && len(partOfName) > 0 {
		entry.PartOf = partOfName
	}

	acc[serviceName] = entry
}

func addVersion(entry client.NamespaceVersion, vsn string) client.NamespaceVersion {
	if entry.Version == "" {
		entry.Version = vsn
		return entry
	}

	parsedOld, err := semver.NewVersion(strings.TrimPrefix(entry.Version, "v"))
	if err != nil {
		entry.Version = vsn
		return entry
	}

	parsedNew, err := semver.NewVersion(strings.TrimPrefix(vsn, "v"))
	if err != nil {
		entry.Version = vsn
		return entry
	}

	if parsedNew.LessThan(parsedOld) {
		entry.Version = vsn
	}
	return entry
}

func (p *Pinger) getVersionedCrd(ctx context.Context) (map[string][]controllerv1.NormalizedVersion, error) {
	crdList, err := p.apiExtClient.ApiextensionsV1().CustomResourceDefinitions().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	crdVersionsMap := make(map[string][]controllerv1.NormalizedVersion, len(crdList.Items))
	for _, crd := range crdList.Items {
		kind := crd.Spec.Names.Kind
		group := crd.Spec.Group
		groupKind := fmt.Sprintf("%s/%s", group, kind)
		// Pre-allocate slice with capacity based on the number of versions in the CRD
		parsedVersions := make([]controllerv1.NormalizedVersion, 0, len(crd.Spec.Versions))
		for _, v := range crd.Spec.Versions {
			parsed, ok := controllerv1.ParseVersion(v.Name)
			if !ok {
				continue
			}
			// flag enabling/disabling this version from being served via REST APIs
			if !v.Served {
				continue
			}
			parsedVersions = append(parsedVersions, *parsed)
		}
		sort.Slice(parsedVersions, func(i, j int) bool {
			return controllerv1.CompareVersions(parsedVersions[i], parsedVersions[j])
		})
		crdVersionsMap[groupKind] = parsedVersions
	}

	return crdVersionsMap, nil
}

func (p *Pinger) GetDeprecatedCustomResources(ctx context.Context) []console.DeprecatedCustomResourceAttributes {
	logger := log.FromContext(ctx)
	crds, err := p.getVersionedCrd(ctx)
	if err != nil {
		logger.Error(err, "failed to retrieve versioned CRDs")
		return nil
	}

	// Pre-allocate slice with estimated capacity based on the number of CRDs
	deprecated := make([]console.DeprecatedCustomResourceAttributes, 0, len(crds)*2)
	for groupKind, versions := range crds {
		gkList := strings.Split(groupKind, "/")
		if len(gkList) != 2 {
			continue
		}
		group := gkList[0]
		kind := gkList[1]
		d := p.getDeprecatedCustomResourceObjects(ctx, versions, group, kind)
		deprecated = append(deprecated, d...)
	}
	return deprecated
}

func (p *Pinger) getDeprecatedCustomResourceObjects(ctx context.Context, versions []controllerv1.NormalizedVersion, group, kind string) []console.DeprecatedCustomResourceAttributes {
	// Pre-allocate slice with estimated capacity based on the number of version pairs
	versionPairs := getVersionPairs(versions)
	deprecatedCustomResourceAttributes := make([]console.DeprecatedCustomResourceAttributes, 0, len(versionPairs)*5)
	for _, version := range versionPairs {
		gvk := schema.GroupVersionKind{
			Group:   group,
			Version: version.PreviousVersion,
			Kind:    kind,
		}

		pager := common.ListResources(ctx, p.k8sClient, gvk, nil)
		for pager.HasNext() {
			items, err := pager.NextPage()
			if err != nil {
				break
			}
			for _, item := range items {
				attr := console.DeprecatedCustomResourceAttributes{
					Group:       group,
					Kind:        kind,
					Name:        item.GetName(),
					Version:     version.PreviousVersion,
					NextVersion: version.LatestVersion,
				}
				if item.GetNamespace() != "" {
					attr.Namespace = lo.ToPtr(item.GetNamespace())
				}
				deprecatedCustomResourceAttributes = append(deprecatedCustomResourceAttributes, attr)
			}
		}
	}
	return deprecatedCustomResourceAttributes
}

type VersionPair struct {
	LatestVersion   string
	PreviousVersion string
}

func getVersionPairs(versions []controllerv1.NormalizedVersion) []VersionPair {
	// Helper function for creating VersionPair
	createVersionPair := func(latest, previous controllerv1.NormalizedVersion) VersionPair {
		return VersionPair{
			LatestVersion:   latest.Raw,
			PreviousVersion: previous.Raw,
		}
	}

	versionPairs := make([]VersionPair, 0, len(versions)-1) // Preallocate slice capacity
	for i := 0; i < len(versions)-1; i++ {
		versionPair := createVersionPair(versions[i], versions[i+1])
		versionPairs = append(versionPairs, versionPair)
	}
	return versionPairs
}
