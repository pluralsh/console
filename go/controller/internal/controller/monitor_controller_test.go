package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Monitor Controller", Ordered, func() {
	const namespace = "default"
	ctx := context.Background()

	newReconciler := func(consoleClient *mocks.ConsoleClientMock) *controller.MonitorReconciler {
		return &controller.MonitorReconciler{
			Client:           k8sClient,
			Scheme:           k8sClient.Scheme(),
			ConsoleClient:    consoleClient,
			CredentialsCache: nil,
		}
	}

	Context("When reconciling a log monitor referencing an existing service by handle", func() {
		const (
			monitorName   = "test-monitor-handle"
			workbenchName = "test-workbench-for-monitor"
			id            = "monitor-123"
			serviceID     = "service-123"
			workbenchID   = "workbench-123"
		)

		typeNamespacedName := types.NamespacedName{Name: monitorName, Namespace: namespace}
		workbenchNamespacedName := types.NamespacedName{Name: workbenchName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the Workbench resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Workbench{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchName, Namespace: namespace},
				Spec:       v1alpha1.WorkbenchSpec{Name: lo.ToPtr(workbenchName)},
			}, func(p *v1alpha1.Workbench) {
				p.Status.ID = lo.ToPtr(workbenchID)
			})).To(Succeed())

			By("creating the Monitor resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: monitorName, Namespace: namespace},
				Spec: v1alpha1.MonitorSpec{
					Name:         lo.ToPtr("console-error-logs"),
					Service:      lo.ToPtr("mgmt/console"),
					WorkbenchRef: &corev1.ObjectReference{Name: workbenchName, Namespace: namespace},
					Prompt:       lo.ToPtr("Investigate the errors"),
					Modes: &v1alpha1.WorkbenchJobModes{
						Plan:   lo.ToPtr(true),
						Budget: &v1alpha1.WorkbenchJobBudget{Cost: lo.ToPtr("5.5"), Tokens: lo.ToPtr(int64(1000))},
						Kubernetes: &v1alpha1.WorkbenchJobKubernetesModes{
							Delete:            lo.ToPtr(false),
							ExcludeNamespaces: []string{"kube-system"},
						},
					},
					Description:    lo.ToPtr("Fires on too many error logs"),
					Severity:       gqlclient.AlertSeverityHigh,
					Type:           gqlclient.MonitorTypeLog,
					EvaluationCron: "*/5 * * * *",
					Query: v1alpha1.MonitorQuery{
						Log: &v1alpha1.MonitorLogQuery{
							Query:      "error",
							BucketSize: "5m",
							Duration:   lo.ToPtr("30m"),
							Operator:   lo.ToPtr(gqlclient.MonitorOperatorOr),
							Facets:     []v1alpha1.MonitorFacet{{Key: "namespace", Value: "plrl-console"}},
						},
					},
					Threshold: v1alpha1.MonitorThreshold{Aggregate: gqlclient.MonitorAggregateMax, Value: "100.5"},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			monitor := &v1alpha1.Monitor{}
			if err := k8sClient.Get(ctx, typeNamespacedName, monitor); err == nil {
				By("Cleanup the Monitor resource")
				monitor.Finalizers = nil
				Expect(k8sClient.Update(ctx, monitor)).To(Succeed())
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, monitor))).To(Succeed())
			}
			workbench := &v1alpha1.Workbench{}
			if err := k8sClient.Get(ctx, workbenchNamespacedName, workbench); err == nil {
				By("Cleanup the Workbench resource")
				Expect(k8sClient.Delete(ctx, workbench)).To(Succeed())
			}
		})

		It("should successfully create the monitor", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "console").Return(&gqlclient.GetServiceDeploymentTinyByHandle_ServiceDeployment{ID: serviceID, Name: "console"}, nil)
			fakeConsoleClient.On("CreateMonitor", mock.Anything, mock.MatchedBy(func(attrs gqlclient.MonitorAttributes) bool {
				return attrs.ServiceID == serviceID &&
					lo.FromPtr(attrs.WorkbenchID) == workbenchID &&
					attrs.Name == "console-error-logs" &&
					lo.FromPtr(attrs.Prompt) == "Investigate the errors" &&
					attrs.Severity == gqlclient.AlertSeverityHigh &&
					attrs.Type == gqlclient.MonitorTypeLog &&
					attrs.EvaluationCron == "*/5 * * * *" &&
					attrs.Query.Metrics == nil &&
					attrs.Query.Log != nil &&
					attrs.Query.Log.Query == "error" &&
					attrs.Query.Log.BucketSize == "5m" &&
					lo.FromPtr(attrs.Query.Log.Duration) == "30m" &&
					lo.FromPtr(attrs.Query.Log.Operator) == gqlclient.MonitorOperatorOr &&
					len(attrs.Query.Log.Facets) == 1 &&
					attrs.Query.Log.Facets[0].Key == "namespace" &&
					attrs.Query.Log.Facets[0].Value == "plrl-console" &&
					attrs.Threshold.Aggregate == gqlclient.MonitorAggregateMax &&
					attrs.Threshold.Value == 100.5 &&
					attrs.Modes != nil &&
					lo.FromPtr(attrs.Modes.Plan) &&
					attrs.Modes.Budget != nil &&
					lo.FromPtr(attrs.Modes.Budget.Cost) == 5.5 &&
					lo.FromPtr(attrs.Modes.Budget.Tokens) == 1000 &&
					attrs.Modes.Kubernetes != nil &&
					!lo.FromPtr(attrs.Modes.Kubernetes.Delete) &&
					len(attrs.Modes.Kubernetes.ExcludeNamespaces) == 1 &&
					lo.FromPtr(attrs.Modes.Kubernetes.ExcludeNamespaces[0]) == "kube-system"
			})).Return(&gqlclient.MonitorFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			Expect(monitor.Status.SHA).NotTo(BeNil())
			expectedStatus := readyStatus(id)
			expectedStatus.SHA = monitor.Status.SHA
			Expect(common.SanitizeStatusConditions(monitor.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
			Expect(monitor.Finalizers).To(ContainElement(controller.MonitorFinalizer))
			Expect(monitor.OwnerReferences).To(BeEmpty())
		})

		It("should not update the monitor when spec did not change", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "console").Return(&gqlclient.GetServiceDeploymentTinyByHandle_ServiceDeployment{ID: serviceID, Name: "console"}, nil)
			fakeConsoleClient.On("GetMonitor", mock.Anything, id).Return(&gqlclient.MonitorFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "UpdateMonitor", mock.Anything, mock.Anything, mock.Anything)
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "CreateMonitor", mock.Anything, mock.Anything)
		})

		It("should successfully update the monitor when spec changed", func() {
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: monitorName, Namespace: namespace},
			}, func(p *v1alpha1.Monitor) {
				p.Spec.Severity = gqlclient.AlertSeverityCritical
				p.Spec.Threshold.Value = "200"
			})).To(Succeed())

			previous := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, previous)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "console").Return(&gqlclient.GetServiceDeploymentTinyByHandle_ServiceDeployment{ID: serviceID, Name: "console"}, nil)
			fakeConsoleClient.On("GetMonitor", mock.Anything, id).Return(&gqlclient.MonitorFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateMonitor", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.MonitorAttributes) bool {
				return attrs.ServiceID == serviceID &&
					attrs.Severity == gqlclient.AlertSeverityCritical &&
					attrs.Threshold.Value == 200
			})).Return(&gqlclient.MonitorFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			Expect(monitor.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(monitor.Status.SHA).NotTo(Equal(previous.Status.SHA))
			Expect(meta.IsStatusConditionTrue(monitor.Status.Conditions, v1alpha1.ReadyConditionType.String())).To(BeTrue())
		})

		It("should send the full query when switching the monitor type", func() {
			// Use a full update instead of common.MaybePatchObject. It builds a merge patch against
			// an empty object, so it can set fields but never removes them, and removing fields is
			// exactly what this test needs.
			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			monitor.Spec.Type = gqlclient.MonitorTypeMetrics
			monitor.Spec.Query = v1alpha1.MonitorQuery{Metrics: &v1alpha1.MonitorMetricsQuery{Query: "up"}}
			monitor.Spec.Description = nil
			monitor.Spec.Modes = nil
			Expect(k8sClient.Update(ctx, monitor)).To(Succeed())

			updated := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, updated)).To(Succeed())
			Expect(updated.Spec.Query.Log).To(BeNil())
			Expect(updated.Spec.Description).To(BeNil())
			Expect(updated.Spec.Modes).To(BeNil())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "console").Return(&gqlclient.GetServiceDeploymentTinyByHandle_ServiceDeployment{ID: serviceID, Name: "console"}, nil)
			fakeConsoleClient.On("GetMonitor", mock.Anything, id).Return(&gqlclient.MonitorFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateMonitor", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.MonitorAttributes) bool {
				// Removed fields have to be passed as nil so that they are cleared in the Console API.
				return attrs.Type == gqlclient.MonitorTypeMetrics &&
					attrs.Query.Log == nil &&
					attrs.Query.Metrics != nil &&
					attrs.Query.Metrics.Query == "up" &&
					attrs.Description == nil &&
					attrs.Modes == nil
			})).Return(&gqlclient.MonitorFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())
		})

		It("should recreate the monitor when it no longer exists in the Console API", func() {
			const newID = "monitor-456"

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "console").Return(&gqlclient.GetServiceDeploymentTinyByHandle_ServiceDeployment{ID: serviceID, Name: "console"}, nil)
			fakeConsoleClient.On("GetMonitor", mock.Anything, id).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateMonitor", mock.Anything, mock.Anything).Return(&gqlclient.MonitorFragment{ID: newID}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			Expect(monitor.Status.ID).To(Equal(lo.ToPtr(newID)))

			// Restore the original ID for the deletion test.
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: monitorName, Namespace: namespace},
			}, func(p *v1alpha1.Monitor) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
		})

		It("should successfully delete the monitor", func() {
			resource := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsMonitorExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteMonitor", mock.Anything, id).Return(nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			monitor := &v1alpha1.Monitor{}
			err = k8sClient.Get(ctx, typeNamespacedName, monitor)
			Expect(errors.IsNotFound(err)).To(BeTrue())
		})
	})

	Context("When reconciling a metrics monitor referencing a ServiceDeployment", func() {
		const (
			monitorName = "test-monitor-service-ref"
			serviceName = "test-service-for-monitor"
			clusterName = "test-cluster-for-monitor"
			id          = "monitor-789"
			serviceID   = "service-789"
		)

		typeNamespacedName := types.NamespacedName{Name: monitorName, Namespace: namespace}
		serviceNamespacedName := types.NamespacedName{Name: serviceName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the Monitor resource before the service exists")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: monitorName, Namespace: namespace},
				Spec: v1alpha1.MonitorSpec{
					ServiceRef:     &corev1.ObjectReference{Name: serviceName},
					Severity:       gqlclient.AlertSeverityMedium,
					Type:           gqlclient.MonitorTypeMetrics,
					EvaluationCron: "*/10 * * * *",
					Query: v1alpha1.MonitorQuery{
						Metrics: &v1alpha1.MonitorMetricsQuery{
							Query:    "sum(rate(container_cpu_usage_seconds_total[5m]))",
							Step:     lo.ToPtr("1m"),
							Duration: lo.ToPtr("1h"),
							Options: &v1alpha1.MonitorMetricsOptions{
								Azure: &v1alpha1.MonitorMetricsAzureOptions{ResourceID: lo.ToPtr("resource-id")},
							},
						},
					},
					Threshold: v1alpha1.MonitorThreshold{Aggregate: gqlclient.MonitorAggregateAvg, Value: "0.8"},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			monitor := &v1alpha1.Monitor{}
			if err := k8sClient.Get(ctx, typeNamespacedName, monitor); err == nil {
				By("Cleanup the Monitor resource")
				monitor.Finalizers = nil
				Expect(k8sClient.Update(ctx, monitor)).To(Succeed())
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, monitor))).To(Succeed())
			}
			service := &v1alpha1.ServiceDeployment{}
			if err := k8sClient.Get(ctx, serviceNamespacedName, service); err == nil {
				By("Cleanup the ServiceDeployment resource")
				service.Finalizers = nil
				Expect(k8sClient.Update(ctx, service)).To(Succeed())
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, service))).To(Succeed())
			}
		})

		It("should wait for the referenced service", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)

			result, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "CreateMonitor", mock.Anything, mock.Anything)

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			Expect(monitor.Status.ID).To(BeNil())
			Expect(meta.IsStatusConditionFalse(monitor.Status.Conditions, v1alpha1.ReadyConditionType.String())).To(BeTrue())
			Expect(meta.IsStatusConditionFalse(monitor.Status.Conditions, v1alpha1.SynchronizedConditionType.String())).To(BeTrue())
		})

		It("should wait for the referenced service to be ready", func() {
			By("creating the ServiceDeployment resource without an ID")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
				Spec: v1alpha1.ServiceSpec{
					Version:    lo.ToPtr("1.0"),
					ClusterRef: corev1.ObjectReference{Name: clusterName, Namespace: namespace},
				},
			}, nil)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)

			result, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "CreateMonitor", mock.Anything, mock.Anything)
		})

		It("should successfully create the monitor once the service is ready", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			}, func(p *v1alpha1.ServiceDeployment) {
				p.Status.ID = lo.ToPtr(serviceID)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateMonitor", mock.Anything, mock.MatchedBy(func(attrs gqlclient.MonitorAttributes) bool {
				return attrs.ServiceID == serviceID &&
					attrs.WorkbenchID == nil &&
					attrs.Modes == nil &&
					attrs.Name == monitorName &&
					attrs.Type == gqlclient.MonitorTypeMetrics &&
					attrs.Query.Log == nil &&
					attrs.Query.Metrics != nil &&
					attrs.Query.Metrics.Query == "sum(rate(container_cpu_usage_seconds_total[5m]))" &&
					lo.FromPtr(attrs.Query.Metrics.Step) == "1m" &&
					lo.FromPtr(attrs.Query.Metrics.Duration) == "1h" &&
					attrs.Query.Metrics.Options != nil &&
					attrs.Query.Metrics.Options.Azure != nil &&
					lo.FromPtr(attrs.Query.Metrics.Options.Azure.ResourceID) == "resource-id" &&
					attrs.Threshold.Aggregate == gqlclient.MonitorAggregateAvg &&
					attrs.Threshold.Value == 0.8
			})).Return(&gqlclient.MonitorFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			expectedStatus := readyStatus(id)
			expectedStatus.SHA = monitor.Status.SHA
			Expect(common.SanitizeStatusConditions(monitor.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))

			By("checking that the service is set as the owner")
			Expect(monitor.OwnerReferences).To(HaveLen(1))
			Expect(monitor.OwnerReferences[0].Kind).To(Equal("ServiceDeployment"))
			Expect(monitor.OwnerReferences[0].Name).To(Equal(serviceName))
		})

		It("should remove the finalizer when the monitor no longer exists in the Console API", func() {
			resource := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsMonitorExists", mock.Anything, id).Return(false, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "DeleteMonitor", mock.Anything, mock.Anything)

			monitor := &v1alpha1.Monitor{}
			err = k8sClient.Get(ctx, typeNamespacedName, monitor)
			Expect(errors.IsNotFound(err)).To(BeTrue())
		})
	})

	Context("When reconciling a monitor referencing a missing service by handle", func() {
		const monitorName = "test-monitor-missing-service"
		typeNamespacedName := types.NamespacedName{Name: monitorName, Namespace: namespace}

		BeforeAll(func() {
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: monitorName, Namespace: namespace},
				Spec: v1alpha1.MonitorSpec{
					Service:        lo.ToPtr("mgmt/missing"),
					Severity:       gqlclient.AlertSeverityLow,
					Type:           gqlclient.MonitorTypeLog,
					EvaluationCron: "*/5 * * * *",
					Query:          v1alpha1.MonitorQuery{Log: &v1alpha1.MonitorLogQuery{Query: "error", BucketSize: "5m"}},
					Threshold:      v1alpha1.MonitorThreshold{Aggregate: gqlclient.MonitorAggregateMax, Value: "1"},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			monitor := &v1alpha1.Monitor{}
			if err := k8sClient.Get(ctx, typeNamespacedName, monitor); err == nil {
				monitor.Finalizers = nil
				Expect(k8sClient.Update(ctx, monitor)).To(Succeed())
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, monitor))).To(Succeed())
			}
		})

		It("should wait until the service exists", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetServiceTinyByHandle", "mgmt", "missing").Return(nil, errors.NewNotFound(schema.GroupResource{}, "missing"))

			result, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
			fakeConsoleClient.AssertExpectations(GinkgoT())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "CreateMonitor", mock.Anything, mock.Anything)

			monitor := &v1alpha1.Monitor{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, monitor)).To(Succeed())
			Expect(monitor.Status.ID).To(BeNil())
			condition := meta.FindStatusCondition(monitor.Status.Conditions, v1alpha1.SynchronizedConditionType.String())
			Expect(condition).NotTo(BeNil())
			Expect(condition.Status).To(Equal(metav1.ConditionFalse))
			Expect(condition.Message).To(ContainSubstring("mgmt/missing not found"))
		})
	})

	Context("When validating Monitor resources", func() {
		newMonitor := func(name string, mutate func(spec *v1alpha1.MonitorSpec)) *v1alpha1.Monitor {
			m := &v1alpha1.Monitor{
				ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
				Spec: v1alpha1.MonitorSpec{
					Service:        lo.ToPtr("mgmt/console"),
					Severity:       gqlclient.AlertSeverityLow,
					Type:           gqlclient.MonitorTypeLog,
					EvaluationCron: "*/5 * * * *",
					Query:          v1alpha1.MonitorQuery{Log: &v1alpha1.MonitorLogQuery{Query: "error", BucketSize: "5m"}},
					Threshold:      v1alpha1.MonitorThreshold{Aggregate: gqlclient.MonitorAggregateMax, Value: "1"},
				},
			}
			mutate(&m.Spec)
			return m
		}

		DescribeTable("should accept valid evaluation cron expressions",
			func(name, cron string) {
				monitor := newMonitor(name, func(spec *v1alpha1.MonitorSpec) {
					spec.EvaluationCron = cron
				})
				Expect(k8sClient.Create(ctx, monitor)).To(Succeed())
				Expect(k8sClient.Delete(ctx, monitor)).To(Succeed())
			},
			Entry("5 fields", "valid-monitor-cron-5", "*/5 * * * *"),
			Entry("6 fields with year", "valid-monitor-cron-6", "0 0 1 1 * 2027"),
			Entry("shortcut", "valid-monitor-cron-shortcut", "@hourly"),
		)

		DescribeTable("should reject invalid resources",
			func(name string, mutate func(spec *v1alpha1.MonitorSpec), message string) {
				err := k8sClient.Create(ctx, newMonitor(name, mutate))
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(ContainSubstring(message))
			},
			Entry("both service references", "invalid-monitor-both-refs", func(spec *v1alpha1.MonitorSpec) {
				spec.ServiceRef = &corev1.ObjectReference{Name: "service"}
			}, "exactly one of serviceRef or service must be set"),
			Entry("no service reference", "invalid-monitor-no-refs", func(spec *v1alpha1.MonitorSpec) {
				spec.Service = nil
			}, "exactly one of serviceRef or service must be set"),
			Entry("malformed service handle", "invalid-monitor-bad-handle", func(spec *v1alpha1.MonitorSpec) {
				spec.Service = lo.ToPtr("console")
			}, "spec.service"),
			Entry("log type without log query", "invalid-monitor-no-log", func(spec *v1alpha1.MonitorSpec) {
				spec.Query = v1alpha1.MonitorQuery{Metrics: &v1alpha1.MonitorMetricsQuery{Query: "up"}}
			}, "query.log must be set when type is LOG"),
			Entry("both queries set", "invalid-monitor-both-queries", func(spec *v1alpha1.MonitorSpec) {
				spec.Query.Metrics = &v1alpha1.MonitorMetricsQuery{Query: "up"}
			}, "only one of log or metrics can be set"),
			Entry("tool query without workbench", "invalid-monitor-tool", func(spec *v1alpha1.MonitorSpec) {
				spec.Query.Log.Tool = lo.ToPtr("elastic")
			}, "workbenchRef is required for tool-backed monitor queries"),
			Entry("invalid threshold value", "invalid-monitor-threshold", func(spec *v1alpha1.MonitorSpec) {
				spec.Threshold.Value = "high"
			}, "spec.threshold.value"),
			Entry("invalid bucket size", "invalid-monitor-bucket", func(spec *v1alpha1.MonitorSpec) {
				spec.Query.Log.BucketSize = "5 minutes"
			}, "spec.query.log.bucketSize"),
			Entry("invalid severity", "invalid-monitor-severity", func(spec *v1alpha1.MonitorSpec) {
				spec.Severity = "SEVERE"
			}, "spec.severity"),
			Entry("invalid evaluation cron", "invalid-monitor-cron", func(spec *v1alpha1.MonitorSpec) {
				spec.EvaluationCron = "5m"
			}, "spec.evaluationCron"),
			Entry("evaluation cron with too few fields", "invalid-monitor-cron-fields", func(spec *v1alpha1.MonitorSpec) {
				spec.EvaluationCron = "*/5 * * *"
			}, "spec.evaluationCron"),
		)
	})
})
