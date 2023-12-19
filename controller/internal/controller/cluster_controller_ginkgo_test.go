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
	Context("When creating a resource", func() {
		const (
			awsProviderName   = "aws-test-provider"
			providerConsoleID = "12345-67890"
			awsClusterName    = "aws-test-cluster"
			byokClusterName   = "byok-test-cluster"
			clusterConsoleID  = "12345-67890"
		)

		ctx := context.Background()
		awsNamespacedName := types.NamespacedName{Name: awsClusterName, Namespace: "default"}
		byokNamespacedName := types.NamespacedName{Name: awsClusterName, Namespace: "default"}

		BeforeAll(func() {
			By("creating AWS provider")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{Name: awsProviderName},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "aws",
					Name:  awsProviderName,
				},
			}, func(p *v1alpha1.Provider) {
				p.Status.ID = lo.ToPtr(providerConsoleID)
			})).To(Succeed())

			By("creating AWS cluster")
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

			By("creating BYOK cluster")
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
		})

		AfterAll(func() {
			awsCluster := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, awsNamespacedName, awsCluster)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Cluster")
			Expect(k8sClient.Delete(ctx, awsCluster)).To(Succeed())

			byokCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, byokCluster)
			Expect(err).NotTo(HaveOccurred())
			By("cleanup BYOK cluster")
			Expect(k8sClient.Delete(ctx, byokCluster)).To(Succeed())
		})

		It("should successfully reconcile AWS cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, awsClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: clusterConsoleID}, nil)

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
				ID:  lo.ToPtr(clusterConsoleID),
				SHA: lo.ToPtr("CI5QLJIIR62PCOX2PVNBUEUUO2XXJ7SYZNQE2ZNY7N3F4ADISJNA===="),
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
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, awsClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: clusterConsoleID}, nil)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				ID:  lo.ToPtr(clusterConsoleID),
				SHA: lo.ToPtr("CI5QLJIIR62PCOX2PVNBUEUUO2XXJ7SYZNQE2ZNY7N3F4ADISJNA===="),
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
	})
})
