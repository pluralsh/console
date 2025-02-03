package metrics

import (
	"time"
)

const (
	DiscoveryAPICacheRefreshMetricName        = "agent_discoveryapi_cache_refresh_total"
	DiscoveryAPICacheRefreshMetricDescription = "The total number of Discovery API cache refresh attempts"

	DiscoveryAPICacheRefreshErrorMetricName        = "agent_discoveryapi_cache_refresh_error_total"
	DiscoveryAPICacheRefreshErrorMetricDescription = "The total number of Discovery API cache refresh errors"

	ServiceReconciliationMetricName        = "agent_service_reconciliations_total"
	ServiceReconciliationMetricDescription = "The total number of service reconciliations"

	ServiceReconciliationErrorMetricName        = "agent_service_reconciliation_errors_total"
	ServiceReconciliationErrorMetricDescription = "The total number of service reconciliation errors"

	ServiceReconciliationDurationMetricName        = "agent_service_reconcile_duration_seconds"
	ServiceReconciliationDurationMetricDescription = "The time it takes to reconcile a service"

	StackRunJobsCreatedMetricName        = "agent_stack_runs_created_total"
	StackRunJobsCreatedMetricDescription = "The total number of created stack runs"

	ResourceCacheOpenWatchesName        = "agent_resource_cache_open_watches_total"
	ResourceCacheOpenWatchesDescription = "The total number of open watches in the resource cache"

	ResourceCacheHitMetricName        = "agent_resource_cache_hit_total"
	ResourceCacheHitMetricDescription = "The total number of resource cache hits"

	ResourceCacheMissMetricName        = "agent_resource_cache_miss_total"
	ResourceCacheMissMetricDescription = "The total number of resource cache misses"

	MetricLabelServiceID                  = "service_id"
	MetricLabelServiceName                = "service_name"
	MetricLabelServiceType                = "service_type"
	MetricLabelServiceReconciliationStage = "service_reconciliation_stage"
	MetricLabelControllerName             = "controller_name"

	ControllerRestartsMetricName        = "agent_controller_restarts_total"
	ControllerRestartsMetricDescription = "The total number of controller restarts"
)

type ServiceReconciliationStage string

func (in ServiceReconciliationStage) String() string {
	return string(in)
}

const (
	ServiceReconciliationStart                  ServiceReconciliationStage = "start"
	ServiceReconciliationPrepareManifestsFinish ServiceReconciliationStage = "prepare_manifests_finish"
	ServiceReconciliationApplyStart             ServiceReconciliationStage = "apply_start"
	ServiceReconciliationApplyFinish            ServiceReconciliationStage = "apply_finish"
	ServiceReconciliationUpdateStatusFinish     ServiceReconciliationStage = "update_status_finish"
	ServiceReconciliationFinish                 ServiceReconciliationStage = "finish"
)

type ServiceReconciliationOption func(*serviceReconciliationOptions)

type serviceReconciliationOptions struct {
	err       error
	startedAt *time.Time
	stage     *ServiceReconciliationStage
}

type ContextKey string

const (
	ContextKeyTimeStart ContextKey = "time_start"
)

type Recorder interface {
	DiscoveryAPICacheRefresh(err error)
	ServiceReconciliation(serviceID, serviceName string, options ...ServiceReconciliationOption)
	ServiceDeletion(serviceID string)
	StackRunJobCreation()
	ResourceCacheWatchStart(resourceType string)
	ResourceCacheWatchEnd(resourceType string)
	ResourceCacheHit(serviceID string)
	ResourceCacheMiss(serviceID string)
	ControllerRestart(name string)
}
