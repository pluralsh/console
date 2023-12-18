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
)

var _ = Describe("Cluster Controller", func() {
	Context("When reconciling a resource", func() {
		const (
			clusterName       = "test-cluster"
			clusterConsoleID  = "12345-67890"
			providerName      = "test-provider"
			providerNamespace = "test-provider"
			providerConsoleID = "12345-67890"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      clusterName,
			Namespace: "default",
		}

		cluster := &v1alpha1.Cluster{}
		provider := &v1alpha1.Provider{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind Cluster")
			err := k8sClient.Get(ctx, typeNamespacedName, cluster)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name:      clusterName,
						Namespace: "default",
					},
					Spec: v1alpha1.ClusterSpec{
						Handle:      lo.ToPtr(clusterName),
						Version:     lo.ToPtr("1.24"),
						Cloud:       "aws",
						ProviderRef: &corev1.ObjectReference{Name: providerName, Namespace: providerNamespace},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}

			By("creating the custom resource for the Kind Provider")
			err = k8sClient.Get(ctx, typeNamespacedName, provider)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Provider{
					ObjectMeta: metav1.ObjectMeta{Name: providerName},
					Spec: v1alpha1.ProviderSpec{
						Cloud:     "aws",
						Name:      providerName,
						Namespace: providerNamespace,
					},
					Status: v1alpha1.ProviderStatus{ID: lo.ToPtr(providerConsoleID)},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
				Expect(k8sClient.Status().Update(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Cluster")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")
			test := struct {
				returnGetClusterByHandle      *gqlclient.ClusterFragment
				returnErrorGetClusterByHandle error
				returnIsClusterExisting       bool
				returnCreateCluster           *gqlclient.ClusterFragment
				returnErrorCreateCluster      error
				expectedStatus                v1alpha1.ClusterStatus
			}{
				returnGetClusterByHandle:      nil,
				returnErrorGetClusterByHandle: errors.NewNotFound(schema.GroupResource{}, clusterName),
				returnIsClusterExisting:       false,
				returnCreateCluster:           &gqlclient.ClusterFragment{ID: clusterConsoleID},
				expectedStatus: v1alpha1.ClusterStatus{
					ID:  lo.ToPtr(clusterConsoleID),
					SHA: lo.ToPtr("DU5PTA62PGOS35CPPCNSRG6PGXUUIWTXVBK5BFXCCGCAAM2K6HYA===="),
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
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(test.returnGetClusterByHandle, test.returnErrorGetClusterByHandle)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(test.returnIsClusterExisting)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(test.returnCreateCluster, test.returnErrorCreateCluster)

			controllerReconciler := &ClusterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, typeNamespacedName, cluster)

			Expect(err).NotTo(HaveOccurred())
			Expect(cluster.Status).To(Equal(test.expectedStatus))
			// TODO(user): Add more specific assertions depending on your controller's reconciliation logic.
			// Example: If you expect a certain status condition after reconciliation, verify it here.
		})
	})
})
