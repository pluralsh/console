package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("BindingPolicy Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			bindingPolicyName = "bindingpolicy-controller-test"
			missingRefName    = "bindingpolicy-controller-missing"
			unreadyRefName    = "bindingpolicy-controller-unready"
			policyName        = "bindingpolicy-policy-ref"
			bindPolicyName    = "bindingpolicy-bind-ref"
			unreadyPolicyName = "bindingpolicy-unready-policy"
			namespace         = "default"
			id                = "binding-policy-123"
			policyID          = "policy-ref-123"
			bindPolicyID      = "bind-policy-ref-123"
			rego              = "package plrl.wb.admission\n\nsample := 0"
			bindRego          = "package plrl.binding\n\nbind := true"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: bindingPolicyName, Namespace: namespace}
		missingNamespacedName := types.NamespacedName{Name: missingRefName, Namespace: namespace}
		unreadyNamespacedName := types.NamespacedName{Name: unreadyRefName, Namespace: namespace}

		bindingPolicyFragment := &gqlclient.BindingPolicyFragment{
			ID:   id,
			Type: gqlclient.BindingPolicyTypeWorkbench,
		}

		BeforeAll(func() {
			By("creating the referenced Policy CRDs")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: policyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:   lo.ToPtr(gqlclient.PolicyTypeWorkbench),
					Policy: lo.ToPtr(rego),
				},
			}, func(p *v1alpha1.Policy) {
				p.Status.ID = lo.ToPtr(policyID)
			})).To(Succeed())

			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: bindPolicyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:   lo.ToPtr(gqlclient.PolicyTypeBinding),
					Policy: lo.ToPtr(bindRego),
				},
			}, func(p *v1alpha1.Policy) {
				p.Status.ID = lo.ToPtr(bindPolicyID)
			})).To(Succeed())

			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: unreadyPolicyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:   lo.ToPtr(gqlclient.PolicyTypeWorkbench),
					Policy: lo.ToPtr(rego),
				},
			}, nil)).To(Succeed())

			By("creating the custom resource for the Kind BindingPolicy")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.BindingPolicy{
				ObjectMeta: metav1.ObjectMeta{Name: bindingPolicyName, Namespace: namespace},
				Spec: v1alpha1.BindingPolicySpec{
					Type: gqlclient.BindingPolicyTypeWorkbench,
					PolicyRef: corev1.ObjectReference{
						Name: policyName,
					},
					BindPolicyRef: corev1.ObjectReference{
						Name: bindPolicyName,
					},
					Matches: &v1alpha1.BindingPolicyMatches{
						Workbench: &v1alpha1.WorkbenchBindingPolicyMatches{
							Regexes: []*string{lo.ToPtr(".*")},
						},
					},
				},
			}, nil)).To(Succeed())

			Expect(common.MaybeCreate(k8sClient, &v1alpha1.BindingPolicy{
				ObjectMeta: metav1.ObjectMeta{Name: missingRefName, Namespace: namespace},
				Spec: v1alpha1.BindingPolicySpec{
					Type: gqlclient.BindingPolicyTypeWorkbench,
					PolicyRef: corev1.ObjectReference{
						Name: "missing-policy-ref",
					},
					BindPolicyRef: corev1.ObjectReference{
						Name: bindPolicyName,
					},
				},
			}, nil)).To(Succeed())

			Expect(common.MaybeCreate(k8sClient, &v1alpha1.BindingPolicy{
				ObjectMeta: metav1.ObjectMeta{Name: unreadyRefName, Namespace: namespace},
				Spec: v1alpha1.BindingPolicySpec{
					Type: gqlclient.BindingPolicyTypeWorkbench,
					PolicyRef: corev1.ObjectReference{
						Name: unreadyPolicyName,
					},
					BindPolicyRef: corev1.ObjectReference{
						Name: bindPolicyName,
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			for _, name := range []string{bindingPolicyName, missingRefName, unreadyRefName} {
				bindingPolicy := &v1alpha1.BindingPolicy{}
				if err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, bindingPolicy); err == nil {
					By("Cleanup the specific resource instance BindingPolicy")
					Expect(k8sClient.Delete(ctx, bindingPolicy)).To(Succeed())
				}
			}

			for _, name := range []string{policyName, bindPolicyName, unreadyPolicyName} {
				policy := &v1alpha1.Policy{}
				if err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, policy); err == nil {
					By("Cleanup the specific resource instance Policy")
					Expect(k8sClient.Delete(ctx, policy)).To(Succeed())
				}
			}
		})

		It("should requeue when policyRef is not found", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: missingNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})

		It("should requeue when policyRef is not yet ready", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: unreadyNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})

		It("should successfully create the resource", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("CreateBindingPolicy", mock.Anything, mock.MatchedBy(func(attrs gqlclient.BindingPolicyAttributes) bool {
				return attrs.PolicyID == policyID &&
					attrs.BindPolicyID == bindPolicyID &&
					attrs.Type == gqlclient.BindingPolicyTypeWorkbench &&
					attrs.Matches != nil &&
					attrs.Matches.Workbench != nil &&
					len(attrs.Matches.Workbench.Regexes) == 1 &&
					attrs.Matches.Workbench.Regexes[0] != nil &&
					*attrs.Matches.Workbench.Regexes[0] == ".*"
			})).Return(bindingPolicyFragment, nil)

			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			bindingPolicy := &v1alpha1.BindingPolicy{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, bindingPolicy)).To(Succeed())
			Expect(bindingPolicy.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(bindingPolicy.Status.SHA).NotTo(BeNil())
			Expect(common.SanitizeStatusConditions(bindingPolicy.Status).Conditions).To(ContainElements(
				metav1.Condition{
					Type:    v1alpha1.ReadyConditionType.String(),
					Status:  metav1.ConditionTrue,
					Reason:  v1alpha1.ReadyConditionReason.String(),
					Message: "",
				},
				metav1.Condition{
					Type:   v1alpha1.SynchronizedConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.SynchronizedConditionReason.String(),
				},
			))
		})

		It("should update the resource when spec changes", func() {
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.BindingPolicy{
				ObjectMeta: metav1.ObjectMeta{Name: bindingPolicyName, Namespace: namespace},
			}, func(p *v1alpha1.BindingPolicy) {
				p.Spec.Interval = lo.ToPtr("1h")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsBindingPolicyExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("UpdateBindingPolicy", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.BindingPolicyUpdateAttributes) bool {
				return attrs.PolicyID != nil && *attrs.PolicyID == policyID &&
					attrs.BindPolicyID != nil && *attrs.BindPolicyID == bindPolicyID &&
					attrs.Interval != nil && *attrs.Interval == "1h"
			})).Return(bindingPolicyFragment, nil)

			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertCalled(mocks.TestingT, "UpdateBindingPolicy", mock.Anything, id, mock.Anything)
		})

		It("should recreate the resource when it is missing from the API", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsBindingPolicyExists", mock.Anything, id).Return(false, nil)
			fakeConsoleClient.On("CreateBindingPolicy", mock.Anything, mock.Anything).Return(bindingPolicyFragment, nil)

			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertCalled(mocks.TestingT, "CreateBindingPolicy", mock.Anything, mock.Anything)
		})

		It("should successfully delete the resource", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.BindingPolicy{
				ObjectMeta: metav1.ObjectMeta{Name: bindingPolicyName, Namespace: namespace},
			}, func(p *v1alpha1.BindingPolicy) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			resource := &v1alpha1.BindingPolicy{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsBindingPolicyExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteBindingPolicy", mock.Anything, id).Return(nil)

			reconciler := &controller.BindingPolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			bindingPolicy := &v1alpha1.BindingPolicy{}
			err = k8sClient.Get(ctx, typeNamespacedName, bindingPolicy)
			Expect(err.Error()).To(Equal("bindingpolicies.deployments.plural.sh \"bindingpolicy-controller-test\" not found"))
		})
	})
})
