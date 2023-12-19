package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/test/mocks"
	"github.com/pluralsh/console/controller/internal/test/utils"
)

func sanitizeClusterStatus(status v1alpha1.ClusterStatus) v1alpha1.ClusterStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	return status
}

var _ = Describe("Cluster Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			awsProviderName              = "aws-provider"
			awsProviderConsoleID         = "aws-provider-console-id"
			awsClusterName               = "aws-cluster"
			awsClusterConsoleID          = "aws-cluster-console-id"
			byokClusterName              = "byok-cluster"
			byokClusterConsoleID         = "byok-cluster-console-id"
			awsReadonlyClusterName       = "aws-readonly-cluster"
			awsReadonlyClusterConsoleID  = "aws-readonly-cluster-console-id"
			byokReadonlyClusterName      = "byok-readonly-cluster"
			byokReadonlyClusterConsoleID = "byok-readonly-cluster-console-id"
		)

		ctx := context.Background()
		awsNamespacedName := types.NamespacedName{Name: awsClusterName, Namespace: "default"}
		byokNamespacedName := types.NamespacedName{Name: byokClusterName, Namespace: "default"}
		awsReadonlyNamespacedName := types.NamespacedName{Name: awsReadonlyClusterName, Namespace: "default"}
		byokReadonlyNamespacedName := types.NamespacedName{Name: byokReadonlyClusterName, Namespace: "default"}

		BeforeAll(func() {
			By("Creating AWS provider")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{Name: awsProviderName},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "aws",
					Name:  awsProviderName,
				},
			}, func(p *v1alpha1.Provider) {
				p.Status.ID = lo.ToPtr(awsProviderConsoleID)
			})).To(Succeed())

			By("Creating AWS cluster")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      awsClusterName,
					Namespace: "default",
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:      lo.ToPtr(awsClusterName),
					Version:     lo.ToPtr("1.24"),
					Cloud:       "aws",
					ProviderRef: &corev1.ObjectReference{Name: awsProviderName},
				},
			}, nil)).To(Succeed())

			By("Creating BYOK cluster")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      byokClusterName,
					Namespace: "default",
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(byokClusterName),
					Cloud:  "byok",
				},
			}, nil)).To(Succeed())

			By("Creating AWS cluster that will adopt existing Console resource")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      awsReadonlyClusterName,
					Namespace: "default",
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(awsReadonlyClusterName),
					Cloud:  "aws",
				},
			}, nil)).To(Succeed())

			By("Creating BYOK cluster that will adopt existing Console resource")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      byokReadonlyClusterName,
					Namespace: "default",
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(byokReadonlyClusterName),
					Cloud:  "byok",
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup AWS cluster")
			awsCluster := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, awsNamespacedName, awsCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, awsCluster)).To(Succeed())

			By("Cleanup BYOK cluster")
			byokCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, byokCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokCluster)).To(Succeed())

			By("Cleanup AWS readonly cluster")
			awsReadonlyCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsReadonlyNamespacedName, awsReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, awsReadonlyCluster)).To(Succeed())

			By("Cleanup BYOK readonly cluster")
			byokReadonlyCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, byokReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokReadonlyCluster)).To(Succeed())
		})

		It("should successfully reconcile AWS cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, awsClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: awsClusterConsoleID}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID:  lo.ToPtr(awsClusterConsoleID),
				SHA: lo.ToPtr("J7CMSICIXLWV7MCWNPBZUA6FEOI3HGTQMNVLYD6VZXX6Y66S6ETQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile and update AWS cluster that was created in previous unit test", func() {
			Expect(utils.MaybePatch(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: awsClusterName, Namespace: "default"},
			}, func(p *v1alpha1.Cluster) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(true)
			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(
				&gqlclient.ClusterFragment{ID: awsClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID:             lo.ToPtr(awsClusterConsoleID),
				SHA:            lo.ToPtr("J7CMSICIXLWV7MCWNPBZUA6FEOI3HGTQMNVLYD6VZXX6Y66S6ETQ===="),
				CurrentVersion: lo.ToPtr("1.25.6"),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile BYOK cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, byokClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: byokClusterConsoleID}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID:  lo.ToPtr(byokClusterConsoleID),
				SHA: lo.ToPtr("CPYLCGRGF2JWFBF3OGRHQQUSBDXW6Y4VMUDQDCQQDEA6G6CAZORQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile and update BYOK cluster that was created in previous unit test", func() {
			Expect(utils.MaybePatch(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: byokClusterName, Namespace: "default"},
			}, func(p *v1alpha1.Cluster) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(true)
			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(
				&gqlclient.ClusterFragment{ID: byokClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, cluster)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID:             lo.ToPtr(byokClusterConsoleID),
				SHA:            lo.ToPtr("CPYLCGRGF2JWFBF3OGRHQQUSBDXW6Y4VMUDQDCQQDEA6G6CAZORQ===="),
				CurrentVersion: lo.ToPtr("1.25.6"),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile AWS readonly cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             awsReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID: lo.ToPtr(awsReadonlyClusterConsoleID),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadonlyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadonlyConditionReason.String(),
						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})

		It("should successfully reconcile BYOK readonly cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID: lo.ToPtr(byokReadonlyClusterConsoleID),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadonlyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadonlyConditionReason.String(),
						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
				},
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})
	})
})
