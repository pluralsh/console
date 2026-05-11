package pipelinegates_test

import (
	"context"
	"os"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/mock"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/cmd/agent/args"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/pluralsh/deployment-operator/pkg/controller/pipelinegates"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("Reconciler", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			namespace        = "default"
			gateId           = "1"
			pipelinegateName = "test"
		)
		gateFragment := &console.PipelineGateFragment{
			ID:   gateId,
			Type: console.GateTypeJob,
		}
		pipelinegate := &v1alpha1.PipelineGate{
			ObjectMeta: metav1.ObjectMeta{
				Namespace: namespace,
				Name:      pipelinegateName,
			},
			Spec: v1alpha1.PipelineGateSpec{
				Name: pipelinegateName,
				Type: v1alpha1.GateType(console.GateTypeApproval),
			},
		}

		ctx := context.Background()

		BeforeEach(func() {
			os.Setenv("OPERATOR_NAMESPACE", "default")
		})
		AfterEach(func() {
			os.Unsetenv("OPERATOR_NAMESPACE")
		})

		It("should create Gate object", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterGate", mock.Anything).Return(gateFragment, nil)
			fakeConsoleClient.On("ParsePipelineGateCR", mock.Anything, mock.Anything).Return(pipelinegate, nil)

			cache.InitGateCache(args.ControllerCacheTTL(), fakeConsoleClient)

			reconciler, err := pipelinegates.NewGateReconciler(fakeConsoleClient, kClient, time.Minute)
			Expect(err).NotTo(HaveOccurred())
			_, err = reconciler.Reconcile(ctx, gateId)
			Expect(err).NotTo(HaveOccurred())

			Expect(kClient.Get(ctx, types.NamespacedName{Name: pipelinegateName, Namespace: namespace}, &v1alpha1.PipelineGate{})).NotTo(HaveOccurred())

		})

	})
})
