package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/controller"
	"github.com/pluralsh/console/controller/internal/credentials"
	common "github.com/pluralsh/console/controller/internal/test/common"
	"github.com/pluralsh/console/controller/internal/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("Context Pipeline Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			namespace           = "default"
			pipelineName        = "pipeline-name"
			pipelineConsoleID   = "pipeline-console-id"
			pipelineContextName = "pipeline-context"
			pipelineContextID   = "pipeline-context-id"
		)

		ctx := context.Background()
		pipelineContextNamespacedName := types.NamespacedName{Name: pipelineContextName, Namespace: namespace}
		pipelineNamespacedName := types.NamespacedName{Name: pipelineName, Namespace: namespace}
		BeforeAll(func() {
			By("Creating pipeline")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Pipeline{
				ObjectMeta: metav1.ObjectMeta{
					Name:      pipelineName,
					Namespace: namespace,
				},
				Spec: v1alpha1.PipelineSpec{},
			}, func(p *v1alpha1.Pipeline) {
				p.Status.ID = lo.ToPtr(pipelineConsoleID)
			})).To(Succeed())
			By("Creating pipeline context")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.PipelineContext{
				ObjectMeta: metav1.ObjectMeta{
					Name:      pipelineContextName,
					Namespace: namespace,
				},
				Spec: v1alpha1.PipelineContextSpec{
					PipelineRef: &corev1.ObjectReference{
						Name:      pipelineName,
						Namespace: namespace,
					},
				},
			}, nil)).To(Succeed())
		})
		AfterAll(func() {

			By("Cleanup Pipeline")
			pipeline := &v1alpha1.Pipeline{}
			err := k8sClient.Get(ctx, pipelineNamespacedName, pipeline)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, pipeline)).To(Succeed())

		})
		It("should successfully create pipeline context", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreatePipelineContext", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.CreatePipelineContext{CreatePipelineContext: &gqlclient.PipelineContextFragment{ID: pipelineContextID}}, nil)

			controllerReconciler := &controller.PipelineContextReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: pipelineContextNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			pipeline := &v1alpha1.PipelineContext{}
			err = k8sClient.Get(ctx, pipelineContextNamespacedName, pipeline)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(pipeline.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(pipelineContextID),
				SHA: lo.ToPtr("XSVPPXNATKHUWFMR4ZD65KSTAKEO5L5EIOQNXV545JZTG4YRUQSA===="),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
						Status:  metav1.ConditionFalse,
						Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
						Message: "using default credentials",
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
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
