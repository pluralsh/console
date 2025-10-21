package controller_test

import (
	"context"
	"sort"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/internal/credentials"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

const namespace = "default"

func sanitizeClusterStatus(status v1alpha1.ClusterStatus) v1alpha1.ClusterStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

	return status
}

var _ = Describe("Cluster Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			byokReadonlyClusterName      = "byok-readonly-cluster"
			byokReadonlyClusterConsoleID = "byok-readonly-cluster-console-id"
		)

		ctx := context.Background()
		byokReadonlyNamespacedName := types.NamespacedName{Name: byokReadonlyClusterName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating BYOK cluster that will adopt existing Console resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      byokReadonlyClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(byokReadonlyClusterName),
					Cloud:  "byok",
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup BYOK readonly cluster")
			byokReadonlyCluster := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, byokReadonlyNamespacedName, byokReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokReadonlyCluster)).To(Succeed())
		})

		It("should successfully reconcile BYOK readonly cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA: lo.ToPtr("KUEGIQWRYFJEEYRIYV5KIVVWP6AWD66YSD3AODQ54VEIM27IX44A===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
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
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})

		It("should successfully update readonly cluster bindings", func() {
			cluster := &v1alpha1.Cluster{}
			Expect(k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)).NotTo(HaveOccurred())
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: byokReadonlyClusterName, Namespace: namespace},
			}, func(stack *v1alpha1.Cluster) {
				stack.Spec.Bindings = &v1alpha1.Bindings{
					Read: []v1alpha1.Binding{
						{
							UserEmail: lo.ToPtr("test@plural.sh"),
						},
					},
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(&gqlclient.UserFragment{ID: "id"}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA: lo.ToPtr("QEFWK4PFO6XYSBXXXLRFYEF6FTBAEGSJU2ID3R43IZ2QL4VNVOTQ===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
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
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})

		It("should requeue after get bindings error", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, "user"))

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			result, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})
	})
})
