package controller_test

import (
	"context"
	"encoding/json"
	"reflect"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
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

// jsonEqual checks if a JSON string is semantically equal to the expected value.
func jsonEqual(actual *string, expected map[string]any) bool {
	if actual == nil {
		return false
	}

	var got map[string]any
	if err := json.Unmarshal([]byte(*actual), &got); err != nil {
		return false
	}

	return reflect.DeepEqual(got, expected)
}

var _ = Describe("Dashboard Controller", Ordered, func() {
	const namespace = "default"
	ctx := context.Background()

	newReconciler := func(consoleClient *mocks.ConsoleClientMock) *controller.DashboardReconciler {
		return &controller.DashboardReconciler{
			Client:           k8sClient,
			Scheme:           k8sClient.Scheme(),
			ConsoleClient:    consoleClient,
			CredentialsCache: nil,
		}
	}

	Context("When reconciling a resource", func() {
		const (
			dashboardName = "test-dashboard"
			workbenchName = "test-workbench-for-dashboard"
			id            = "dashboard-123"
			workbenchID   = "workbench-456"
		)

		typeNamespacedName := types.NamespacedName{Name: dashboardName, Namespace: namespace}
		workbenchNamespacedName := types.NamespacedName{Name: workbenchName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the parent Workbench resource without an ID")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Workbench{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchName, Namespace: namespace},
				Spec:       v1alpha1.WorkbenchSpec{Name: lo.ToPtr(workbenchName)},
			}, nil)).To(Succeed())

			By("creating the Dashboard resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: dashboardName, Namespace: namespace},
				Spec: v1alpha1.DashboardSpec{
					WorkbenchRef: corev1.ObjectReference{Name: workbenchName},
					Description:  lo.ToPtr("Console overview"),
					Inputs: []v1alpha1.DashboardInput{
						{
							Name:     "namespace",
							Label:    lo.ToPtr("Namespace"),
							Type:     gqlclient.DashboardInputTypeText,
							Default:  lo.ToPtr("plrl-console"),
							Required: lo.ToPtr(true),
						},
						{
							Name:    "pod",
							Type:    gqlclient.DashboardInputTypeSelect,
							Options: []string{"a", "b"},
							Datasource: &v1alpha1.DashboardDatasource{
								Type:  gqlclient.DashboardDatasourceTypeLabels,
								Tool:  "plrl_metric_label_search",
								Input: runtime.RawExtension{Raw: []byte(`{"metric":"up","label":"pod"}`)},
							},
						},
					},
					Graphs: []v1alpha1.DashboardGraph{
						{
							Identifier: "overview",
							Title:      lo.ToPtr("Overview"),
							Type:       gqlclient.DashboardGraphTypeSection,
							Options:    &runtime.RawExtension{Raw: []byte(`{"collapsed":true}`)},
							Layout:     v1alpha1.DashboardGraphLayout{X: 0, Y: 0, W: 12, H: 1},
						},
						{
							Identifier: "notes",
							Type:       gqlclient.DashboardGraphTypeMarkdown,
							SectionID:  lo.ToPtr("overview"),
							Markdown:   lo.ToPtr("## Notes"),
							Layout:     v1alpha1.DashboardGraphLayout{X: 0, Y: 1, W: 4, H: 4},
						},
						{
							Identifier:  "cpu",
							Title:       lo.ToPtr("CPU"),
							Description: lo.ToPtr("CPU usage"),
							Type:        gqlclient.DashboardGraphTypeTimeseries,
							SectionID:   lo.ToPtr("overview"),
							Layout:      v1alpha1.DashboardGraphLayout{X: 4, Y: 1, W: 8, H: 4},
							Datasource: &v1alpha1.DashboardDatasource{
								Type:  gqlclient.DashboardDatasourceTypeMetrics,
								Tool:  "plrl_metrics",
								Input: runtime.RawExtension{Raw: []byte(`{"query":"sum(rate(cpu[5m]))"}`)},
							},
						},
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			dashboard := &v1alpha1.Dashboard{}
			if err := k8sClient.Get(ctx, typeNamespacedName, dashboard); err == nil {
				By("Cleanup the Dashboard resource")
				dashboard.Finalizers = nil
				Expect(k8sClient.Update(ctx, dashboard)).To(Succeed())
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, dashboard))).To(Succeed())
			}
			workbench := &v1alpha1.Workbench{}
			if err := k8sClient.Get(ctx, workbenchNamespacedName, workbench); err == nil {
				By("Cleanup the parent Workbench resource")
				Expect(k8sClient.Delete(ctx, workbench)).To(Succeed())
			}
		})

		It("should wait for the workbench to be ready", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)

			result, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "CreateDashboard", mock.Anything, mock.Anything)

			dashboard := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, dashboard)).To(Succeed())
			Expect(dashboard.Status.ID).To(BeNil())
			condition := meta.FindStatusCondition(dashboard.Status.Conditions, v1alpha1.SynchronizedConditionType.String())
			Expect(condition).NotTo(BeNil())
			Expect(condition.Status).To(Equal(metav1.ConditionFalse))
			Expect(condition.Message).To(ContainSubstring("workbench is not ready"))
		})

		It("should successfully create the dashboard", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Workbench{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchName, Namespace: namespace},
			}, func(p *v1alpha1.Workbench) {
				p.Status.ID = lo.ToPtr(workbenchID)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateDashboard", mock.Anything, mock.MatchedBy(func(attrs gqlclient.DashboardAttributes) bool {
				if lo.FromPtr(attrs.WorkbenchID) != workbenchID ||
					lo.FromPtr(attrs.Name) != dashboardName ||
					lo.FromPtr(attrs.Description) != "Console overview" ||
					len(attrs.Graphs) != 3 || len(attrs.Inputs) != 2 {
					return false
				}

				section, notes, cpu := attrs.Graphs[0], attrs.Graphs[1], attrs.Graphs[2]
				namespaceInput, podInput := attrs.Inputs[0], attrs.Inputs[1]
				return section.Identifier == "overview" &&
					section.Type == gqlclient.DashboardGraphTypeSection &&
					jsonEqual(section.Options, map[string]any{"collapsed": true}) &&
					section.Layout == gqlclient.DashboardGraphLayoutAttributes{X: 0, Y: 0, W: 12, H: 1} &&
					section.Datasource == nil &&
					notes.Type == gqlclient.DashboardGraphTypeMarkdown &&
					lo.FromPtr(notes.Markdown) == "## Notes" &&
					lo.FromPtr(notes.SectionID) == "overview" &&
					notes.Options == nil &&
					cpu.Identifier == "cpu" &&
					lo.FromPtr(cpu.Title) == "CPU" &&
					lo.FromPtr(cpu.Description) == "CPU usage" &&
					cpu.Datasource != nil &&
					cpu.Datasource.Type == gqlclient.DashboardDatasourceTypeMetrics &&
					cpu.Datasource.Tool == "plrl_metrics" &&
					jsonEqual(&cpu.Datasource.Input, map[string]any{"query": "sum(rate(cpu[5m]))"}) &&
					namespaceInput.Name == "namespace" &&
					lo.FromPtr(namespaceInput.Label) == "Namespace" &&
					namespaceInput.Type == gqlclient.DashboardInputTypeText &&
					lo.FromPtr(namespaceInput.Default) == "plrl-console" &&
					lo.FromPtr(namespaceInput.Required) &&
					namespaceInput.Datasource == nil &&
					podInput.Type == gqlclient.DashboardInputTypeSelect &&
					len(podInput.Options) == 2 && lo.FromPtr(podInput.Options[1]) == "b" &&
					podInput.Datasource != nil &&
					podInput.Datasource.Type == gqlclient.DashboardDatasourceTypeLabels &&
					jsonEqual(&podInput.Datasource.Input, map[string]any{"metric": "up", "label": "pod"})
			})).Return(&gqlclient.WorkbenchDashboardFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			dashboard := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, dashboard)).To(Succeed())
			Expect(dashboard.Status.SHA).NotTo(BeNil())
			expectedStatus := readyStatus(id)
			expectedStatus.SHA = dashboard.Status.SHA
			Expect(common.SanitizeStatusConditions(dashboard.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
			Expect(dashboard.Finalizers).To(ContainElement(controller.DashboardFinalizer))

			By("checking that the workbench is set as the owner")
			Expect(dashboard.OwnerReferences).To(HaveLen(1))
			Expect(dashboard.OwnerReferences[0].Kind).To(Equal("Workbench"))
			Expect(dashboard.OwnerReferences[0].Name).To(Equal(workbenchName))
		})

		It("should not update the dashboard when spec did not change", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetDashboard", mock.Anything, id).Return(&gqlclient.WorkbenchDashboardFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())
			fakeConsoleClient.AssertNotCalled(GinkgoT(), "UpdateDashboard", mock.Anything, mock.Anything, mock.Anything)
		})

		It("should successfully update the dashboard when spec changed", func() {
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: dashboardName, Namespace: namespace},
			}, func(p *v1alpha1.Dashboard) {
				p.Spec.Name = lo.ToPtr("renamed-dashboard")
				p.Spec.Graphs = p.Spec.Graphs[:2]
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetDashboard", mock.Anything, id).Return(&gqlclient.WorkbenchDashboardFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateDashboard", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.DashboardAttributes) bool {
				return lo.FromPtr(attrs.Name) == "renamed-dashboard" && len(attrs.Graphs) == 2
			})).Return(&gqlclient.WorkbenchDashboardFragment{ID: id}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			dashboard := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, dashboard)).To(Succeed())
			Expect(meta.IsStatusConditionTrue(dashboard.Status.Conditions, v1alpha1.ReadyConditionType.String())).To(BeTrue())
		})

		It("should recreate the dashboard when it no longer exists in the Console API", func() {
			const newID = "dashboard-789"

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetDashboard", mock.Anything, id).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateDashboard", mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchDashboardFragment{ID: newID}, nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			dashboard := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, dashboard)).To(Succeed())
			Expect(dashboard.Status.ID).To(Equal(lo.ToPtr(newID)))

			// Restore the original ID for the deletion test.
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: dashboardName, Namespace: namespace},
			}, func(p *v1alpha1.Dashboard) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
		})

		It("should reject changing the workbench reference", func() {
			err := common.MaybePatchObject(k8sClient, &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: dashboardName, Namespace: namespace},
			}, func(p *v1alpha1.Dashboard) {
				p.Spec.WorkbenchRef = corev1.ObjectReference{Name: "another-workbench"}
			})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("workbenchRef is immutable"))

			dashboard := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, dashboard)).To(Succeed())
			Expect(dashboard.Spec.WorkbenchRef.Name).To(Equal(workbenchName))
		})

		It("should successfully delete the dashboard", func() {
			resource := &v1alpha1.Dashboard{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsDashboardExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteDashboard", mock.Anything, id).Return(nil)

			_, err := newReconciler(fakeConsoleClient).Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertExpectations(GinkgoT())

			dashboard := &v1alpha1.Dashboard{}
			err = k8sClient.Get(ctx, typeNamespacedName, dashboard)
			Expect(errors.IsNotFound(err)).To(BeTrue())
		})
	})

	Context("When validating Dashboard resources", func() {
		newDashboard := func(name string, mutate func(spec *v1alpha1.DashboardSpec)) *v1alpha1.Dashboard {
			d := &v1alpha1.Dashboard{
				ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
				Spec: v1alpha1.DashboardSpec{
					WorkbenchRef: corev1.ObjectReference{Name: "workbench"},
					Graphs: []v1alpha1.DashboardGraph{{
						Identifier: "notes",
						Type:       gqlclient.DashboardGraphTypeMarkdown,
						Markdown:   lo.ToPtr("notes"),
						Layout:     v1alpha1.DashboardGraphLayout{X: 0, Y: 0, W: 1, H: 1},
					}},
				},
			}
			mutate(&d.Spec)
			return d
		}

		DescribeTable("should reject invalid resources",
			func(name string, mutate func(spec *v1alpha1.DashboardSpec), message string) {
				err := k8sClient.Create(ctx, newDashboard(name, mutate))
				Expect(err).To(HaveOccurred())
				Expect(err.Error()).To(ContainSubstring(message))
			},
			Entry("markdown graph without markdown", "invalid-dashboard-markdown", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs[0].Markdown = nil
			}, "markdown must be set for MARKDOWN graphs"),
			Entry("duplicate graph identifiers", "invalid-dashboard-duplicate", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs = append(spec.Graphs, spec.Graphs[0])
			}, "Duplicate value"),
			Entry("empty graph size", "invalid-dashboard-layout", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs[0].Layout.W = 0
			}, "spec.graphs[0].layout.w"),
			Entry("invalid graph type", "invalid-dashboard-type", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs[0].Type = "LINE"
			}, "spec.graphs[0].type"),
			Entry("graph referencing unknown section", "invalid-dashboard-unknown-section", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs[0].SectionID = lo.ToPtr("missing")
			}, "sectionId must reference an existing SECTION graph"),
			Entry("graph referencing a non-section graph", "invalid-dashboard-non-section", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs = append(spec.Graphs, v1alpha1.DashboardGraph{
					Identifier: "child",
					Type:       gqlclient.DashboardGraphTypeStat,
					SectionID:  lo.ToPtr("notes"),
					Layout:     v1alpha1.DashboardGraphLayout{X: 1, Y: 0, W: 1, H: 1},
				})
			}, "sectionId must reference an existing SECTION graph"),
			Entry("nested sections", "invalid-dashboard-nested-sections", func(spec *v1alpha1.DashboardSpec) {
				spec.Graphs = append(spec.Graphs,
					v1alpha1.DashboardGraph{
						Identifier: "outer",
						Type:       gqlclient.DashboardGraphTypeSection,
						Layout:     v1alpha1.DashboardGraphLayout{X: 0, Y: 1, W: 1, H: 1},
					},
					v1alpha1.DashboardGraph{
						Identifier: "inner",
						Type:       gqlclient.DashboardGraphTypeSection,
						SectionID:  lo.ToPtr("outer"),
						Layout:     v1alpha1.DashboardGraphLayout{X: 0, Y: 2, W: 1, H: 1},
					},
				)
			}, "sections cannot be nested"),
		)
	})
})
