package controller_test

import (
	"context"
	"sort"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

func sanitizeClusterRestoreStatus(status v1alpha1.ClusterRestoreStatus) v1alpha1.ClusterRestoreStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

	return status
}

var _ = Describe("Cluster Restore Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			restoreName      = "restore"
			restoreConsoleID = "restore-console-id"
			restoreBackupID  = "restore-backup-id"
		)

		ctx := context.Background()
		namespacedName := types.NamespacedName{Name: restoreName, Namespace: "default"}

		BeforeAll(func() {
			By("Creating restore")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ClusterRestore{
				ObjectMeta: metav1.ObjectMeta{
					Name:      restoreName,
					Namespace: "default",
				},
				Spec: v1alpha1.ClusterRestoreSpec{},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup restore")
			restore := &v1alpha1.ClusterRestore{}
			err := k8sClient.Get(ctx, namespacedName, restore)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, restore)).To(Succeed())
		})

		It("should requeue when cluster is not ready", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterRestore", mock.Anything, mock.AnythingOfType("string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, restoreName))
			fakeConsoleClient.On("IsClusterRestoreExisting", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
			controllerReconciler := &controller.ClusterRestoreReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			result, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())

			restore := &v1alpha1.ClusterRestore{}
			err = k8sClient.Get(ctx, namespacedName, restore)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterRestoreStatus(restore.Status)).To(Equal(sanitizeClusterRestoreStatus(v1alpha1.ClusterRestoreStatus{
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
						Status:  metav1.ConditionFalse,
						Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
						Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadyConditionReason.String(),
					},
					{
						Type:    v1alpha1.SynchronizedConditionType.String(),
						Status:  metav1.ConditionFalse,
						Reason:  v1alpha1.SynchronizedConditionReasonError.String(),
						Message: "cluster is not ready",
					},
				},
			})))

		})

		It("should successfully reconcile cluster restore", func() {
			cr := &v1alpha1.ClusterRestore{}
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.ClusterRestore{
				ObjectMeta: metav1.ObjectMeta{Name: restoreName, Namespace: namespace},
			}, func(c *v1alpha1.ClusterRestore) {
				c.Spec = v1alpha1.ClusterRestoreSpec{
					BackupID: lo.ToPtr(restoreBackupID),
				}
			})).To(Succeed())
			Expect(k8sClient.Get(ctx, namespacedName, cr)).NotTo(HaveOccurred())
			Expect(cr.Spec.HasBackupID()).To(BeTrue())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterRestore", mock.Anything, mock.AnythingOfType("string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, restoreName))
			fakeConsoleClient.On("IsClusterRestoreExisting", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("CreateClusterRestore", mock.Anything, restoreBackupID).Return(&gqlclient.ClusterRestoreFragment{ID: restoreConsoleID, Status: gqlclient.RestoreStatusSuccessful}, nil)
			controllerReconciler := &controller.ClusterRestoreReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			restore := &v1alpha1.ClusterRestore{}
			err = k8sClient.Get(ctx, namespacedName, restore)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterRestoreStatus(restore.Status)).To(Equal(sanitizeClusterRestoreStatus(v1alpha1.ClusterRestoreStatus{
				ID:     lo.ToPtr(restoreConsoleID),
				Status: gqlclient.RestoreStatusSuccessful,
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
						Status:  metav1.ConditionFalse,
						Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
						Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
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
			})))
		})

	})
})
