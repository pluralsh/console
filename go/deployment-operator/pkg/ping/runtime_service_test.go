package ping_test

import (
	"context"

	"github.com/samber/lo"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/deployment-operator/pkg/ping"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("Scraper", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "default"
			namespace    = "default"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		backup := &velerov1.Backup{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Backup")
			err := kClient.Get(ctx, typeNamespacedName, backup)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting Backup: %v", err)
				resource := &velerov1.Backup{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: velerov1.BackupSpec{},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &velerov1.Backup{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Backup")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should return deprecated resources", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCredentials").Return("", "")
			fakeConsoleClient.On("MyCluster").Return(&console.MyCluster{
				MyCluster: &console.MyCluster_MyCluster_{
					SupportedAddons: lo.ToSlicePtr([]string{"velero"}),
				},
			}, nil)

			reconciler, err := ping.New(fakeConsoleClient, cfg, kClient, nil, nil)
			Expect(err).NotTo(HaveOccurred())
			ds := reconciler.GetDeprecatedCustomResources(ctx)
			Expect(ds).To(HaveLen(1))
			Expect(ds[0].Version).To(Equal("v1"))
			Expect(ds[0].NextVersion).To(Equal("v2alpha1"))
		})
	})
})
