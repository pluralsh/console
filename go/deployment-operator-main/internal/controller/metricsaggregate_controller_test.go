package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/version"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/scraper"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("MetricsAggregate Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			metricsAggregateName = "global"
			namespace            = "default"
		)

		ctx := context.Background()

		apiGroups := []metav1.APIGroup{
			{
				Name: "metrics.k8s.io",
				Versions: []metav1.GroupVersionForDiscovery{
					{
						GroupVersion: "metrics.k8s.io/v1beta1",
						Version:      "v1beta1",
					},
				},
				PreferredVersion: metav1.GroupVersionForDiscovery{
					GroupVersion: "metrics.k8s.io/v1beta1",
					Version:      "v1beta1",
				},
			},
		}

		versionInfo := &version.Info{
			Major:        "1",
			Minor:        "28",
			GitVersion:   "v1.28.0",
			GitCommit:    "abcdef1234567890",
			GitTreeState: "clean",
			BuildDate:    "2023-09-01T00:00:00Z",
			GoVersion:    "go1.21.0",
			Compiler:     "gc",
			Platform:     "linux/amd64",
		}

		metricsAggregate := types.NamespacedName{Name: metricsAggregateName, Namespace: namespace}

		It("should create global metrics aggregate", func() {
			discoveryClient := mocks.NewDiscoveryInterfaceMock(mocks.TestingT)
			discoveryClient.On("ServerGroups").Return(apiGroups, nil)
			discoveryClient.On("ServerGroupsAndResources").Return(lo.ToSlicePtr(apiGroups), nil, nil)
			discoveryClient.On("ServerVersion").Return(versionInfo, nil)

			cache := discoverycache.NewCache(discoveryClient, mapper)
			err := cache.Refresh()
			Expect(err).NotTo(HaveOccurred())

			r := MetricsAggregateReconciler{
				Client:         kClient,
				Scheme:         kClient.Scheme(),
				DiscoveryCache: cache,
			}
			_, err = r.Reconcile(ctx, reconcile.Request{NamespacedName: metricsAggregate})
			Expect(err).NotTo(HaveOccurred())
			metrics := &v1alpha1.MetricsAggregate{}
			Expect(kClient.Get(ctx, metricsAggregate, metrics)).NotTo(HaveOccurred())
		})

		It("should create global metrics aggregate", func() {
			discoveryClient := mocks.NewDiscoveryInterfaceMock(mocks.TestingT)
			discoveryClient.On("ServerGroups").Return(apiGroups, nil)
			discoveryClient.On("ServerGroupsAndResources").Return(lo.ToSlicePtr(apiGroups), nil, nil)
			discoveryClient.On("ServerVersion").Return(versionInfo, nil)

			cache := discoverycache.NewCache(discoveryClient, mapper)
			err := cache.Refresh()
			Expect(err).NotTo(HaveOccurred())

			scraper.GetMetrics().Add(v1alpha1.MetricsAggregateStatus{
				Nodes:                  1,
				MemoryTotalBytes:       104857600,
				MemoryAvailableBytes:   1073741824,
				MemoryUsedPercentage:   10,
				CPUTotalMillicores:     100,
				CPUAvailableMillicores: 1000,
				CPUUsedPercentage:      10,
				Conditions:             nil,
			})

			r := MetricsAggregateReconciler{
				Client:         kClient,
				Scheme:         kClient.Scheme(),
				DiscoveryCache: cache,
			}
			_, err = r.Reconcile(ctx, reconcile.Request{NamespacedName: metricsAggregate})
			Expect(err).NotTo(HaveOccurred())
			metrics := &v1alpha1.MetricsAggregate{}
			Expect(kClient.Get(ctx, metricsAggregate, metrics)).NotTo(HaveOccurred())
			Expect(metrics.Status.Nodes).Should(Equal(1))
			Expect(metrics.Status.CPUAvailableMillicores).Should(Equal(int64(1000)))
			Expect(metrics.Status.CPUTotalMillicores).Should(Equal(int64(100)))
			Expect(metrics.Status.CPUUsedPercentage).Should(Equal(int64(10)))
			Expect(metrics.Status.MemoryAvailableBytes).Should(Equal(int64(1073741824)))
			Expect(metrics.Status.MemoryTotalBytes).Should(Equal(int64(104857600)))
			Expect(metrics.Status.MemoryUsedPercentage).Should(Equal(int64(10)))
		})
	})
})
