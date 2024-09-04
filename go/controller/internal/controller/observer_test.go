package controller_test

import (
	"context"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Observer Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			prAutomationName = "observer-pr"
			observerName     = "observer-test"
			pipelineName     = "observer-pipeline"
			namespace        = "default"
			id               = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      observerName,
			Namespace: namespace,
		}

		generatedPrAutomation := generatePRAutomation(prAutomationName, v1alpha1.PrAutomationSpec{
			ScmConnectionRef: corev1.ObjectReference{
				Name: "test",
			},
		})
		generatedPrAutomation.Namespace = namespace

		BeforeAll(func() {

			By("Creating pipeline")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Pipeline{
				ObjectMeta: metav1.ObjectMeta{
					Name:      pipelineName,
					Namespace: namespace,
				},
				Spec: v1alpha1.PipelineSpec{},
			}, func(p *v1alpha1.Pipeline) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			By("Creating PR Automation")
			Expect(common.MaybeCreate(k8sClient, generatedPrAutomation, func(in *v1alpha1.PrAutomation) {
				in.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			By("creating the custom resource for the Kind Observer")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Observer{
				ObjectMeta: metav1.ObjectMeta{Name: observerName, Namespace: namespace},
				Spec: v1alpha1.ObserverSpec{
					Name:    lo.ToPtr(observerName),
					Crontab: "5 4 * * *",
					Target: v1alpha1.ObserverTarget{
						Order:  gqlclient.ObserverTargetOrderSemver,
						Target: gqlclient.ObserverTargetTypeOci,
					},
					Actions: []v1alpha1.ObserverAction{
						{
							Type: gqlclient.ObserverActionTypePipeline,
							Configuration: v1alpha1.ObserverConfiguration{
								Pipeline: &v1alpha1.ObserverPipelineAction{
									PipelineRef: corev1.ObjectReference{
										Name:      pipelineName,
										Namespace: namespace,
									},
									Context: runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)},
								},
							},
						},
						{
							Type: gqlclient.ObserverActionTypePr,
							Configuration: v1alpha1.ObserverConfiguration{
								Pr: &v1alpha1.ObserverPrAction{
									PrAutomationRef: corev1.ObjectReference{
										Name:      prAutomationName,
										Namespace: namespace,
									},
									Context: runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)},
								},
							},
						},
					},
					ProjectRef: nil,
				},
			}, nil)).To(Succeed())

		})

		AfterAll(func() {
			observer := &v1alpha1.Observer{}
			err := k8sClient.Get(ctx, typeNamespacedName, observer)
			if err == nil {
				By("Cleanup the specific resource instance Observer")
				Expect(k8sClient.Delete(ctx, observer)).To(Succeed())
			}

			Expect(k8sClient.Delete(ctx, generatedPrAutomation)).To(Succeed())
		})

		It("should successfully reconcile the resource Observer", func() {
			By("Create Observer")
			test := struct {
				returnCreateObserver *gqlclient.ObserverFragment
				expectedStatus       v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("TGXUGI7FRHZ7XWT6LM3SDK3OHNRI7333EDWRODGAS3IBLXGPQ4RQ===="),
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
				},
				returnCreateObserver: &gqlclient.ObserverFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsObserverExists", mock.Anything, mock.Anything).Return(false, nil).Times(2)
			fakeConsoleClient.On("UpsertObserver", mock.Anything, mock.Anything).Return(test.returnCreateObserver, nil)
			reconciler := &controller.ObserverReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
				HelmRepositoryAuth: &controller.HelmRepositoryAuth{
					Client: k8sClient,
					Scheme: k8sClient.Scheme(),
				},
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.Observer{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource Observer", func() {
			By("Update Observer")
			test := struct {
				returnCreateObserver *gqlclient.ObserverFragment
				expectedStatus       v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("GHAUDI7QWJTE6JOWXSUU4T7A34JR4ZSPYZUTDOZJZ75ENRCE3SAA===="),
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
				},
				returnCreateObserver: &gqlclient.ObserverFragment{
					ID: id,
				},
			}

			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Observer{
				ObjectMeta: metav1.ObjectMeta{Name: observerName, Namespace: namespace},
			}, func(observer *v1alpha1.Observer) {
				observer.Spec.Crontab = "5 4 * * 1"
				observer.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsObserverExists", mock.Anything, mock.Anything).Return(true, nil).Times(2)
			fakeConsoleClient.On("UpsertObserver", mock.Anything, mock.Anything).Return(test.returnCreateObserver, nil)
			reconciler := &controller.ObserverReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
				HelmRepositoryAuth: &controller.HelmRepositoryAuth{
					Client: k8sClient,
					Scheme: k8sClient.Scheme(),
				},
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.Observer{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

	})

})
