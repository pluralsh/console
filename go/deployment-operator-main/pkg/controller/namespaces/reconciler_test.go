package namespaces_test

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/controller/namespaces"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
)

var _ = Describe("Reconciler", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			namespaceId   = "1"
			namespaceName = "test"
		)
		clusterNamespace := &console.ManagedNamespaceFragment{
			ID:   namespaceId,
			Name: namespaceName,
		}
		ctx := context.Background()

		It("should create Namespace", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetNamespace", mock.Anything).Return(clusterNamespace, nil)

			reconciler := namespaces.NewNamespaceReconciler(fakeConsoleClient, kClient, time.Minute, time.Minute)
			_, err := reconciler.Reconcile(ctx, namespaceId)
			Expect(err).NotTo(HaveOccurred())

			existing := &v1.Namespace{}
			Expect(kClient.Get(ctx, types.NamespacedName{Name: namespaceName}, existing)).NotTo(HaveOccurred())
		})

		It("should Update Namespace", func() {
			clusterNamespace.Labels = map[string]interface{}{
				"a": "b",
			}

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetNamespace", mock.Anything).Return(clusterNamespace, nil)

			reconciler := namespaces.NewNamespaceReconciler(fakeConsoleClient, kClient, time.Minute, time.Minute)
			_, err := reconciler.Reconcile(ctx, namespaceId)
			Expect(err).NotTo(HaveOccurred())

			existing := &v1.Namespace{}
			Expect(kClient.Get(ctx, types.NamespacedName{Name: namespaceName}, existing)).NotTo(HaveOccurred())
			Expect(existing.Labels).To(Not(BeNil()))
			Expect(existing.Labels["a"]).To(Equal("b"))
		})

	})
})
