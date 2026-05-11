/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/opencost/opencost/core/pkg/opencost"
	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	consoleclient "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

const kubeCostJitter = time.Minute * 5

type ServiceIDCache struct {
	items      cmap.ConcurrentMap[K8sObjectIdentifier, string]
	clearAfter time.Duration
}

// NewServiceIDCache self-cleaning cache
func NewServiceIDCache(clearAfter time.Duration) *ServiceIDCache {
	cache := &ServiceIDCache{
		items:      cmap.NewStringer[K8sObjectIdentifier, string](),
		clearAfter: clearAfter,
	}

	// Start the auto-cleaning goroutine
	go cache.startCleanup()
	return cache
}

func (c *ServiceIDCache) Set(key K8sObjectIdentifier, value string) {
	c.items.Set(key, value)
}
func (c *ServiceIDCache) Get(key K8sObjectIdentifier) (string, bool) {
	return c.items.Get(key)
}

func (c *ServiceIDCache) startCleanup() {
	for {
		time.Sleep(c.clearAfter)
		c.items.Clear()
	}
}

var kubecostResourceTypes = []string{"deployment", "statefulset", "daemonset"}

// KubecostExtractorReconciler reconciles a KubecostExtractor object
type KubecostExtractorReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	KubeClient       kubernetes.Interface
	ExtConsoleClient consoleclient.Client
	Tasks            cmap.ConcurrentMap[string, context.CancelFunc]
	ServiceIDCache   *ServiceIDCache
	Proxy            bool
}

func (r *KubecostExtractorReconciler) RunOnInterval(ctx context.Context, key string, interval time.Duration, condition wait.ConditionWithContextFunc) {
	if _, exists := r.Tasks.Get(key); exists {
		return
	}
	ctxCancel, cancel := context.WithCancel(ctx)
	r.Tasks.Set(key, cancel)

	go func() {
		_ = wait.PollUntilContextCancel(ctxCancel, interval, true, condition)
	}()
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=kubecostextractors,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=kubecostextractors/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=kubecostextractors/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *KubecostExtractorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	kubecost := &v1alpha1.KubecostExtractor{}
	if err := r.Get(ctx, req.NamespacedName, kubecost); err != nil {
		logger.Error(err, "Unable to fetch kubecost")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if !kubecost.DeletionTimestamp.IsZero() {
		if cancel, exists := r.Tasks.Get(req.String()); exists {
			cancel()
			r.Tasks.Remove(req.String())
		}
	}

	utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, kubecost)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// check service
	kubecostService := &corev1.Service{}
	if err := r.Get(ctx, client.ObjectKey{Name: kubecost.Spec.KubecostServiceRef.Name, Namespace: kubecost.Spec.KubecostServiceRef.Namespace}, kubecostService); err != nil {
		logger.Error(err, "Unable to fetch service for kubecost")
		utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	recommendationThreshold, err := strconv.ParseFloat(kubecost.Spec.RecommendationThreshold, 64)
	if err != nil {
		logger.Error(err, "Unable to parse recommendation threshold")
		utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	r.RunOnInterval(ctx, req.String(), kubecost.Spec.GetInterval(), func(ctx context.Context) (done bool, err error) {
		time.Sleep(time.Duration(rand.Int63n(int64(kubeCostJitter))))
		// Always patch object when exiting this function, so we can persist any object changes.
		defer func() {
			if err := scope.PatchObject(); err != nil && reterr == nil {
				reterr = err
			}
		}()
		clusterCostAttr, err := r.getClusterCost(ctx, kubecostService, kubecost.Spec.GetPort())
		if err != nil {
			logger.Error(err, "Unable to fetch cluster cost")
			utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		}
		namespacesCostAtrr, err := r.getNamespacesCost(ctx, kubecostService, kubecost.Spec.GetPort())
		if err != nil {
			logger.Error(err, "Unable to fetch namespacesCostAtrr cost")
			utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		}

		recommendations, err := r.getRecommendationAttributes(ctx, kubecostService, kubecost.Spec.GetPort(), recommendationThreshold, kubecost.Spec.RecommendationsSettings)
		if err != nil {
			logger.Error(err, "Unable to fetch recommendations")
			utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		}

		// nothing for specified time window
		if clusterCostAttr == nil && namespacesCostAtrr == nil && recommendations == nil {
			utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
			return false, nil
		}

		if _, err := r.ExtConsoleClient.IngestClusterCost(console.CostIngestAttributes{
			Cluster:         clusterCostAttr,
			Namespaces:      namespacesCostAtrr,
			Recommendations: recommendations,
		}); err != nil {
			logger.Error(err, "Unable to ingest cluster cost")
			utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
			return false, nil
		}
		utils.MarkCondition(kubecost.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return false, nil
	})

	return ctrl.Result{}, nil
}

func (r *KubecostExtractorReconciler) fetch(host, path string, params map[string]string) ([]byte, error) {
	query := ""
	if len(params) > 0 {
		urlParams := url.Values{}
		for k, v := range params {
			urlParams.Add(k, v)
		}
		query = "?" + urlParams.Encode()
	}

	tr := &http.Transport{
		MaxIdleConns:          10,
		IdleConnTimeout:       30 * time.Second,
		DisableCompression:    true,
		ResponseHeaderTimeout: 120 * time.Second,
	}

	httpClient := &http.Client{Transport: tr}
	resp, err := httpClient.Get(fmt.Sprintf("http://%s%s%s", host, path, query))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var buffer bytes.Buffer
	_, err = io.Copy(&buffer, resp.Body)
	if err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func (r *KubecostExtractorReconciler) getAllocation(ctx context.Context, srv *corev1.Service, servicePort, aggregate, multiAggregation string, idle bool, recommendations *v1alpha1.RecommendationsSettings) (*allocationResponse, error) {
	queryParams := map[string]string{
		"window":     "30d",
		"aggregate":  aggregate,
		"accumulate": "true",
	}
	if multiAggregation != "" {
		queryParams["aggregate"] = multiAggregation
	}

	if idle {
		queryParams["shareIdle"] = "true"
	}

	if recommendations != nil {
		filter := recommendationsFilter(*recommendations)
		if len(filter) > 0 {
			queryParams["filter"] = filter
		}
	}

	var response []byte
	var err error
	if r.Proxy {
		response, err = r.KubeClient.CoreV1().Services(srv.Namespace).ProxyGet("", srv.Name, servicePort, "/model/allocation", queryParams).DoRaw(ctx)
	} else {
		response, err = r.fetch(fmt.Sprintf("%s.%s:%s", srv.Name, srv.Namespace, servicePort), "/model/allocation", queryParams)
	}
	if err != nil {
		return nil, err
	}
	ar := &allocationResponse{}
	if err = json.Unmarshal(response, ar); err != nil {
		return nil, err
	}
	return ar, nil
}

func (r *KubecostExtractorReconciler) getRecommendationAttributes(ctx context.Context, srv *corev1.Service, servicePort string, recommendationThreshold float64, recommendations *v1alpha1.RecommendationsSettings) ([]*console.ClusterRecommendationAttributes, error) {
	var result []*console.ClusterRecommendationAttributes
	for _, resourceType := range kubecostResourceTypes {
		ar, err := r.getAllocation(ctx, srv, servicePort, "", fmt.Sprintf("%s,%s", resourceType, "pod"), false, recommendations)
		if err != nil {
			return nil, err
		}
		if ar.Code != http.StatusOK {
			return nil, fmt.Errorf("unexpected status code: %d", ar.Code)
		}
		for _, resourceCosts := range ar.Data {
			if resourceCosts == nil {
				continue
			}
			parentResourceMap := containers.NewSet[string]()
			for name, allocation := range resourceCosts {
				resourceName := name
				splitName := strings.Split(name, "/")
				if len(splitName) == 2 {
					resourceName = splitName[0]
				}
				if resourceName == opencost.IdleSuffix || resourceName == opencost.UnallocatedSuffix {
					continue
				}
				totalCost := allocation.TotalCost()
				if totalCost > recommendationThreshold {
					if !parentResourceMap.Has(resourceName) {
						result = append(result, r.convertClusterRecommendationAttributes(ctx, allocation, name, resourceType))
						parentResourceMap.Add(resourceName)
					}
				}
			}
		}
	}

	return result, nil
}

func (r *KubecostExtractorReconciler) getNamespacesCost(ctx context.Context, srv *corev1.Service, servicePort string) ([]*console.CostAttributes, error) {
	var result []*console.CostAttributes
	ar, err := r.getAllocation(ctx, srv, servicePort, "namespace", "", false, nil)
	if err != nil {
		return nil, err
	}
	if ar.Code != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", ar.Code)
	}
	for _, namespaceCosts := range ar.Data {
		if namespaceCosts == nil {
			continue
		}
		for namespace, allocation := range namespaceCosts {
			if namespace == opencost.IdleSuffix {
				continue
			}
			attr := convertCostAttributes(allocation, nil, nil)
			attr.Namespace = lo.ToPtr(namespace)
			result = append(result, attr)
		}
	}

	return result, nil
}

func (r *KubecostExtractorReconciler) getClusterCost(ctx context.Context, srv *corev1.Service, servicePort string) (*console.CostAttributes, error) {
	controlPlaneCost, err := r.getControlPlaneCost(ctx, srv, servicePort)
	if err != nil {
		return nil, err
	}
	nodeCost, err := r.getNodeCost(ctx, srv, servicePort)
	if err != nil {
		return nil, err
	}

	clusterID, err := r.getClusterID(ctx, srv, servicePort)
	if err != nil {
		return nil, err
	}
	ar, err := r.getAllocation(ctx, srv, servicePort, "cluster", "", true, nil)
	if err != nil {
		return nil, err
	}
	if ar.Code != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", ar.Code)
	}
	for _, clusterCosts := range ar.Data {
		if clusterCosts == nil {
			continue
		}

		allocation, ok := clusterCosts[clusterID]
		if ok {
			return convertCostAttributes(allocation, nodeCost, controlPlaneCost), nil
		}
	}

	return nil, nil
}

func (r *KubecostExtractorReconciler) getControlPlaneCost(ctx context.Context, srv *corev1.Service, servicePort string) (*float64, error) {
	ar, err := r.getAllocation(ctx, srv, servicePort, "controller", "", false, nil)
	if err != nil {
		return nil, err
	}
	if ar.Code != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", ar.Code)
	}
	for _, controllerCosts := range ar.Data {
		if controllerCosts == nil {
			continue
		}
		allocation, ok := controllerCosts[opencost.UnallocatedSuffix]
		if ok {
			return lo.ToPtr(allocation.TotalCost()), nil
		}
	}

	return nil, nil
}

func (r *KubecostExtractorReconciler) getNodeCost(ctx context.Context, srv *corev1.Service, servicePort string) (*float64, error) {
	var totalNodeCost float64
	ar, err := r.getAllocation(ctx, srv, servicePort, "node", "", true, nil)
	if err != nil {
		return nil, err
	}
	if ar.Code != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", ar.Code)
	}
	for _, nodeCosts := range ar.Data {
		if nodeCosts == nil {
			continue
		}
		for _, allocation := range nodeCosts {
			totalNodeCost += allocation.TotalCost()
		}
	}
	if totalNodeCost > 0 {
		return &totalNodeCost, nil
	}
	return nil, nil
}

func (r *KubecostExtractorReconciler) getClusterID(ctx context.Context, srv *corev1.Service, servicePort string) (string, error) {
	var response []byte
	var err error
	if r.Proxy {
		response, err = r.KubeClient.CoreV1().Services(srv.Namespace).ProxyGet("", srv.Name, servicePort, "/model/clusterInfo", nil).DoRaw(ctx)
	} else {
		response, err = r.fetch(fmt.Sprintf("%s.%s:%s", srv.Name, srv.Namespace, servicePort), "/model/clusterInfo", nil)
	}
	if err != nil {
		return "", err
	}
	var resp clusterinfoResponse
	err = json.Unmarshal(response, &resp)
	if err != nil {
		return "", err
	}
	return resp.Data.ClusterID, nil
}

func (r *KubecostExtractorReconciler) getObjectInfo(ctx context.Context, resourceType console.ScalingRecommendationType, namespace, name string) (container, serviceId *string, resourceRequest *ResourceRequests, err error) {
	gvk := schema.GroupVersionKind{
		Group:   "apps",
		Version: "v1",
	}
	switch resourceType {
	case console.ScalingRecommendationTypeDeployment:
		gvk.Kind = "Deployment"
	case console.ScalingRecommendationTypeDaemonset:
		gvk.Kind = "DaemonSet"
	case console.ScalingRecommendationTypeStatefulset:
		gvk.Kind = "StatefulSet"
	default:
		return nil, nil, nil, nil
	}
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(gvk)
	if err = r.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, obj); err != nil {
		return
	}
	serviceId, err = r.getServiceID(ctx, obj)
	if err != nil {
		return
	}

	containersResourceRequest := ExtractResourceRequests(obj)
	if len(containersResourceRequest) > 0 {
		// get resource requests from the first container
		resourceRequests := algorithms.MapValues(containersResourceRequest)
		resourceRequest = resourceRequests[0]
	}

	return
}

func (r *KubecostExtractorReconciler) getServiceID(ctx context.Context, obj *unstructured.Unstructured) (*string, error) {
	k8sObjectIdentifier := K8sObjectIdentifier{
		GVK:       obj.GroupVersionKind(),
		Namespace: obj.GetNamespace(),
		Name:      obj.GetName(),
	}
	id, ok := r.ServiceIDCache.Get(k8sObjectIdentifier)
	if ok {
		return lo.ToPtr(id), nil
	}

	svcId, ok := obj.GetAnnotations()[common.OwningInventoryKey]
	if ok {
		r.ServiceIDCache.Set(k8sObjectIdentifier, svcId)
		return lo.ToPtr(svcId), nil
	}
	if len(obj.GetOwnerReferences()) > 0 {
		refObj, err := GetObjectFromOwnerReference(ctx, r.Client, obj.GetOwnerReferences()[0], obj.GetNamespace())
		if err != nil {
			return nil, err
		}
		svcId, ok := refObj.GetAnnotations()[common.OwningInventoryKey]
		if ok {
			r.ServiceIDCache.Set(k8sObjectIdentifier, svcId)
			return lo.ToPtr(svcId), nil
		}
	}
	return nil, nil
}

type ResourceRequests struct {
	CPU    float64
	Memory float64
}

// ExtractResourceRequests fetches CPU and memory requests from an Unstructured Kubernetes workload object.
func ExtractResourceRequests(obj *unstructured.Unstructured) map[string]*ResourceRequests {
	// Extract the spec.template.spec.containers field
	containers, found, err := unstructured.NestedSlice(obj.Object, "spec", "template", "spec", "containers")
	if err != nil || !found {
		return nil
	}

	containersResourceRequests := make(map[string]*ResourceRequests)

	// Iterate over containers
	for _, container := range containers {
		containerMap, ok := container.(map[string]interface{})
		if !ok {
			continue
		}

		name, found, _ := unstructured.NestedString(containerMap, "name")
		if !found {
			continue
		}

		requests, found, _ := unstructured.NestedMap(containerMap, "resources", "requests")
		if !found {
			continue
		}

		cpuFloat := float64(0)
		memoryFloat := float64(0)
		cpu, ok := requests["cpu"].(string)
		if ok {
			cpuQuantity, err := resource.ParseQuantity(cpu)
			if err == nil {
				cpuFloat = cpuQuantity.AsApproximateFloat64()
			}
		}
		memory, ok := requests["memory"].(string)
		if ok {
			memoryQuantity, err := resource.ParseQuantity(memory)
			if err == nil {
				memoryFloat = memoryQuantity.AsApproximateFloat64()
			}
		}

		containersResourceRequests[name] = &ResourceRequests{
			CPU:    cpuFloat,
			Memory: memoryFloat,
		}
	}

	return containersResourceRequests
}

// SetupWithManager sets up the controller with the Manager.
func (r *KubecostExtractorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.KubecostExtractor{}).
		Complete(r)
}

type allocationResponse struct {
	Code int                              `json:"code"`
	Data []map[string]opencost.Allocation `json:"data"`
}

type clusterinfoResponse struct {
	Data struct {
		ClusterID string `json:"id"`
	} `json:"data"`
}

func (r *KubecostExtractorReconciler) convertClusterRecommendationAttributes(ctx context.Context, allocation opencost.Allocation, name, resourceType string) *console.ClusterRecommendationAttributes {
	resourceTypeEnum := console.ScalingRecommendationType(strings.ToUpper(resourceType))

	resourceName := name
	splitName := strings.Split(name, "/")
	if len(splitName) == 2 {
		resourceName = splitName[0] // parent resource
	}

	result := &console.ClusterRecommendationAttributes{
		Type:       lo.ToPtr(resourceTypeEnum),
		Name:       lo.ToPtr(resourceName),
		CPUCost:    lo.ToPtr(allocation.CPUCost),
		MemoryCost: lo.ToPtr(allocation.RAMCost),
		GpuCost:    lo.ToPtr(allocation.GPUCost),
		CPUUtil:    lo.ToPtr(allocation.CPUCoreUsageAverage),
		MemoryUtil: lo.ToPtr(allocation.RAMBytesUsageAverage),
	}
	if allocation.Properties != nil {
		namespace, ok := allocation.Properties.NamespaceLabels["kubernetes_io_metadata_name"]
		if ok {
			result.Namespace = lo.ToPtr(namespace)
		}
		if allocation.Properties.Container != "" {
			result.Container = lo.ToPtr(allocation.Properties.Container)
		}
	}
	namespace := ""
	if result.Namespace != nil {
		namespace = *result.Namespace
	}

	container, serviceID, resourceRequest, err := r.getObjectInfo(ctx, resourceTypeEnum, namespace, resourceName)
	if err != nil {
		return result
	}
	result.Container = container
	result.ServiceID = serviceID
	if resourceRequest != nil {
		result.CPURequest = lo.ToPtr(resourceRequest.CPU)
		result.MemoryRequest = lo.ToPtr(resourceRequest.Memory)
	}
	return result
}

func convertCostAttributes(allocation opencost.Allocation, nodeCost, controlPlaneCost *float64) *console.CostAttributes {
	attr := &console.CostAttributes{
		Memory:           lo.ToPtr(allocation.RAMBytes()),
		CPU:              lo.ToPtr(allocation.CPUCores()),
		Storage:          lo.ToPtr(allocation.PVBytes()),
		MemoryUtil:       lo.ToPtr(allocation.RAMBytesUsageAverage),
		CPUUtil:          lo.ToPtr(allocation.CPUCoreUsageAverage),
		CPUCost:          lo.ToPtr(allocation.CPUCost),
		MemoryCost:       lo.ToPtr(allocation.RAMCost),
		GpuCost:          lo.ToPtr(allocation.GPUCost),
		LoadBalancerCost: lo.ToPtr(allocation.LoadBalancerCost),
		ControlPlaneCost: controlPlaneCost,
		NodeCost:         nodeCost,
		StorageCost:      lo.ToPtr(allocation.PVCost()),
	}
	if allocation.GPUAllocation != nil {
		attr.GpuUtil = allocation.GPUAllocation.GPUUsageAverage
	}
	return attr
}

func recommendationsFilter(recommendations v1alpha1.RecommendationsSettings) string {
	result := ""
	if len(recommendations.ExcludeNamespaces) > 0 {
		result = fmt.Sprintf(`namespace!:"%s"`, strings.Join(recommendations.ExcludeNamespaces, `","`))
	}
	if len(recommendations.RequireAnnotations) > 0 {
		// Build the filter string
		parts := make([]string, 0, len(recommendations.RequireAnnotations))
		keys := algorithms.MapKeys(recommendations.RequireAnnotations)
		sort.Strings(keys)
		for _, key := range keys {
			parts = append(parts, fmt.Sprintf(`annotation[%s]:"%s"`, key, recommendations.RequireAnnotations[key]))
		}
		if len(result) > 0 {
			return fmt.Sprintf("%s+%s", result, strings.Join(parts, "+"))
		}
		return strings.Join(parts, "+")
	}

	return result
}
