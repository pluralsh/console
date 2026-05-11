package restore_test

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/controller/restore"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	"k8s.io/apimachinery/pkg/types"
)

var _ = Describe("Reconciler", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			namespace  = "default"
			restoreId  = "1"
			backupName = "test"
		)
		clusterRestore := &console.ClusterRestoreFragment{
			ID:     restoreId,
			Status: console.RestoreStatusPending,
			Backup: &console.ClusterBackupFragment{
				Name: backupName,
			},
		}
		ctx := context.Background()

		It("should create Restore object", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterRestore", mock.Anything).Return(clusterRestore, nil)

			reconciler := restore.NewRestoreReconciler(fakeConsoleClient, kClient, time.Minute, time.Minute, namespace)
			_, err := reconciler.Reconcile(ctx, restoreId)
			Expect(err).NotTo(HaveOccurred())

			veleroRestore := &velerov1.Restore{}
			Expect(kClient.Get(ctx, types.NamespacedName{Name: restoreId, Namespace: namespace}, veleroRestore)).NotTo(HaveOccurred())
		})

		It("should Update Cluster Restore", func() {

			veleroRestore := &velerov1.Restore{}
			Expect(kClient.Get(ctx, types.NamespacedName{Name: restoreId, Namespace: namespace}, veleroRestore)).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterRestore", mock.Anything).Return(clusterRestore, nil)
			fakeConsoleClient.On("UpdateClusterRestore", mock.AnythingOfType("string"), mock.Anything).Return(nil, nil)

			reconciler := restore.NewRestoreReconciler(fakeConsoleClient, kClient, time.Minute, time.Minute, namespace)
			_, err := reconciler.Reconcile(ctx, restoreId)
			Expect(err).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, veleroRestore)).To(Succeed())
		})

	})
})
