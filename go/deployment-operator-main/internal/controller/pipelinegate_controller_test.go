package controller

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/test/common"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("PipelineGate Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			gateName  = "gate-test"
			namespace = "default"
			id        = "123"
			raw       = `{"backoffLimit":4,"template":{"metadata":{"namespace":"default","creationTimestamp":null},"spec":{"containers":[{"name":"pi","image":"perl:5.34.0","command":["perl","-Mbignum=bpi","-wle","print bpi(2000)"],"resources":{}}],"restartPolicy":"Never"}}}`
		)

		gateCache := cache.NewCache[console.PipelineGateFragment](time.Second, func(id string) (*console.PipelineGateFragment, error) {
			return &console.PipelineGateFragment{
				ID:   id,
				Name: "test",
				Spec: &console.GateSpecFragment{
					Job: &console.JobSpecFragment{
						Namespace: namespace,
						Raw:       lo.ToPtr(raw),
					},
				},
				Status: nil,
			}, nil
		})

		ctx := context.Background()
		gateNamespacedName := types.NamespacedName{Name: gateName, Namespace: namespace}
		pipelineGate := &v1alpha1.PipelineGate{}

		BeforeAll(func() {
			By("Creating pipeline gate")
			err := kClient.Get(ctx, gateNamespacedName, pipelineGate)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting PipelineGate: %v", err)
				resource := &v1alpha1.PipelineGate{
					ObjectMeta: metav1.ObjectMeta{
						Name:      gateName,
						Namespace: namespace,
					},
					Spec: v1alpha1.PipelineGateSpec{
						ID:   id,
						Name: "test",
						Type: v1alpha1.GateType(console.GateTypeJob),
						GateSpec: &v1alpha1.GateSpec{
							JobSpec: &batchv1.JobSpec{
								Template: corev1.PodTemplateSpec{
									ObjectMeta: metav1.ObjectMeta{},
									Spec: corev1.PodSpec{
										Containers: []corev1.Container{
											{
												Name: "image1",
											},
										},
									},
								},
							},
						},
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		It("should set state pending", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpdateGate", mock.Anything, mock.Anything).Return(nil)
			reconciler := &PipelineGateReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				GateCache:     gateCache,
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: gateNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			existingGate := &v1alpha1.PipelineGate{}
			Expect(kClient.Get(ctx, gateNamespacedName, existingGate)).NotTo(HaveOccurred())
			Expect(*existingGate.Status.State).Should(Equal(v1alpha1.GateState(console.GateStatePending)))

		})

		It("should reconcile Pending Gate", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpdateGate", mock.Anything, mock.Anything).Return(nil)
			reconciler := &PipelineGateReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				GateCache:     gateCache,
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: gateNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			existingGate := &v1alpha1.PipelineGate{}
			Expect(kClient.Get(ctx, gateNamespacedName, existingGate)).NotTo(HaveOccurred())
			Expect(*existingGate.Status.State).Should(Equal(v1alpha1.GateState(console.GateStateRunning)))
			existingJob := &batchv1.Job{}
			Expect(kClient.Get(ctx, gateNamespacedName, existingJob)).NotTo(HaveOccurred())
		})

		It("should open Gate", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpdateGate", mock.Anything, mock.Anything).Return(nil)
			reconciler := &PipelineGateReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				GateCache:     gateCache,
			}

			existingJob := &batchv1.Job{}
			Expect(kClient.Get(ctx, gateNamespacedName, existingJob)).NotTo(HaveOccurred())

			Expect(common.MaybePatch(kClient, existingJob,
				func(p *batchv1.Job) {
					p.Status.Conditions = []batchv1.JobCondition{
						{
							Type:   batchv1.JobComplete,
							Status: corev1.ConditionTrue,
						},
					}
				})).To(Succeed())

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: gateNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			existingGate := &v1alpha1.PipelineGate{}
			Expect(kClient.Get(ctx, gateNamespacedName, existingGate)).NotTo(HaveOccurred())
			Expect(*existingGate.Status.State).Should(Equal(v1alpha1.GateState(console.GateStateOpen)))

			Expect(kClient.Delete(ctx, existingGate)).To(Succeed())
			Expect(kClient.Delete(ctx, existingJob)).To(Succeed())
		})
	})
})
