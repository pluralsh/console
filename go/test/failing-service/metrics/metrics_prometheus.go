package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/samber/lo"
)

var (
	recorder = (&prometheusRecorder{}).init()
)

type prometheusRecorder struct {
	discoveryAPICacheRefreshCounter      prometheus.Counter
	discoveryAPICacheRefreshErrorCounter prometheus.Counter

	serviceReconciliationCounter      *prometheus.CounterVec
	serviceReconciliationDuration     *prometheus.HistogramVec
	serviceReconciliationErrorCounter *prometheus.CounterVec

	stackRunJobsCreatedCounter prometheus.Counter

	resourceCacheWatchCounter *prometheus.GaugeVec
	resourceCacheHitCounter   *prometheus.CounterVec
	resourceCacheMissCounter  *prometheus.CounterVec

	controllerRestartCounter *prometheus.CounterVec
}

func (in *prometheusRecorder) ResourceCacheWatchStart(resourceType string) {
	in.resourceCacheWatchCounter.WithLabelValues(resourceType).Inc()
}

func (in *prometheusRecorder) ResourceCacheWatchEnd(resourceType string) {
	in.resourceCacheWatchCounter.WithLabelValues(resourceType).Dec()
}

func (in *prometheusRecorder) ResourceCacheHit(serviceID string) {
	in.resourceCacheHitCounter.WithLabelValues(serviceID).Inc()
}

func (in *prometheusRecorder) ResourceCacheMiss(serviceID string) {
	in.resourceCacheMissCounter.WithLabelValues(serviceID).Inc()
}

func (in *prometheusRecorder) DiscoveryAPICacheRefresh(err error) {
	if err != nil {
		in.discoveryAPICacheRefreshErrorCounter.Inc()
		return
	}

	in.discoveryAPICacheRefreshCounter.Inc()
}

func (in *prometheusRecorder) ServiceReconciliation(serviceID, serviceName string, options ...ServiceReconciliationOption) {
	o := &serviceReconciliationOptions{}
	for _, opt := range options {
		opt(o)
	}

	if o.err != nil {
		in.serviceReconciliationErrorCounter.WithLabelValues(serviceID, serviceName).Inc()
		return
	}

	if o.startedAt != nil {
		in.serviceReconciliationDuration.WithLabelValues(serviceID, serviceName, lo.FromPtr(o.stage).String()).Observe(time.Since(*o.startedAt).Seconds())
	}

	in.serviceReconciliationCounter.WithLabelValues(serviceID, serviceName).Inc()
}

func (in *prometheusRecorder) ServiceDeletion(serviceID string) {
	labels := prometheus.Labels{MetricLabelServiceID: serviceID}
	in.serviceReconciliationErrorCounter.DeletePartialMatch(labels)
	in.serviceReconciliationCounter.DeletePartialMatch(labels)
	in.resourceCacheMissCounter.DeletePartialMatch(labels)
	in.resourceCacheHitCounter.DeletePartialMatch(labels)
}

func (in *prometheusRecorder) StackRunJobCreation() {
	in.stackRunJobsCreatedCounter.Inc()
}

func (in *prometheusRecorder) ControllerRestart(name string) {
	in.controllerRestartCounter.WithLabelValues(name).Inc()
}

func (in *prometheusRecorder) init() Recorder {
	in.discoveryAPICacheRefreshCounter = promauto.NewCounter(prometheus.CounterOpts{
		Name: DiscoveryAPICacheRefreshMetricName,
		Help: DiscoveryAPICacheRefreshMetricDescription,
	})
	in.discoveryAPICacheRefreshErrorCounter = promauto.NewCounter(prometheus.CounterOpts{
		Name: DiscoveryAPICacheRefreshErrorMetricName,
		Help: DiscoveryAPICacheRefreshErrorMetricDescription,
	})

	in.serviceReconciliationCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: ServiceReconciliationMetricName,
		Help: ServiceReconciliationMetricDescription,
	}, []string{MetricLabelServiceID, MetricLabelServiceName})
	in.serviceReconciliationErrorCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: ServiceReconciliationErrorMetricName,
		Help: ServiceReconciliationErrorMetricDescription,
	}, []string{MetricLabelServiceID, MetricLabelServiceName})
	in.serviceReconciliationDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: ServiceReconciliationDurationMetricName,
		Help: ServiceReconciliationDurationMetricDescription,
	}, []string{MetricLabelServiceID, MetricLabelServiceName, MetricLabelServiceReconciliationStage})

	in.stackRunJobsCreatedCounter = promauto.NewCounter(prometheus.CounterOpts{
		Name: StackRunJobsCreatedMetricName,
		Help: StackRunJobsCreatedMetricDescription,
	})

	in.resourceCacheWatchCounter = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: ResourceCacheOpenWatchesName,
		Help: ResourceCacheOpenWatchesDescription,
	}, []string{MetricLabelServiceType})
	in.resourceCacheHitCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: ResourceCacheHitMetricName,
		Help: ResourceCacheHitMetricDescription,
	}, []string{MetricLabelServiceID})
	in.resourceCacheMissCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: ResourceCacheMissMetricName,
		Help: ResourceCacheMissMetricDescription,
	}, []string{MetricLabelServiceID})

	in.controllerRestartCounter = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: ControllerRestartsMetricName,
		Help: ControllerRestartsMetricDescription,
	}, []string{MetricLabelControllerName})

	return in
}

func Record() Recorder {
	return recorder
}
