package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Policy Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			policyName         = "policy-controller-test"
			readonlyPolicyName = "policy-controller-readonly"
			projectPolicyName  = "policy-controller-project"
			projectName        = "policy-controller-project-ref"
			namespace          = "default"
			id                 = "policy-123"
			readonlyID         = "policy-readonly-123"
			projectPolicyID    = "policy-project-123"
			projectID          = "project-policy-123"
			rego               = "package plrl.wb.admission\n\nsample := 0"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: policyName, Namespace: namespace}
		readonlyNamespacedName := types.NamespacedName{Name: readonlyPolicyName, Namespace: namespace}
		projectPolicyNamespacedName := types.NamespacedName{Name: projectPolicyName, Namespace: namespace}

		policyFragment := func(policyID, name string) *gqlclient.PolicyFragment {
			return &gqlclient.PolicyFragment{
				ID:     policyID,
				Name:   name,
				Type:   gqlclient.PolicyTypeWorkbench,
				Policy: rego,
			}
		}

		BeforeAll(func() {
			By("creating the referenced Project")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{Name: projectName, Namespace: namespace},
				Spec:       v1alpha1.ProjectSpec{Name: projectName},
			}, func(p *v1alpha1.Project) {
				p.Status.ID = lo.ToPtr(projectID)
			})).To(Succeed())

			By("creating the custom resource for the Kind Policy")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: policyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:        lo.ToPtr(gqlclient.PolicyTypeWorkbench),
					Description: lo.ToPtr("Workbench admission policy"),
					Policy:      lo.ToPtr(rego),
				},
			}, nil)).To(Succeed())

			By("creating a readonly Policy")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: readonlyPolicyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:   lo.ToPtr(gqlclient.PolicyTypeWorkbench),
					Policy: lo.ToPtr(rego),
					Reconciliation: &v1alpha1.Reconciliation{
						DriftDetection: lo.ToPtr(false),
					},
				},
			}, nil)).To(Succeed())

			By("creating a Policy with a projectRef")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: projectPolicyName, Namespace: namespace},
				Spec: v1alpha1.PolicySpec{
					Type:   lo.ToPtr(gqlclient.PolicyTypeWorkbench),
					Policy: lo.ToPtr(rego),
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			for _, name := range []string{policyName, readonlyPolicyName, projectPolicyName} {
				policy := &v1alpha1.Policy{}
				if err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, policy); err == nil {
					By("Cleanup the specific resource instance Policy")
					Expect(k8sClient.Delete(ctx, policy)).To(Succeed())
				}
			}

			project := &v1alpha1.Project{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: projectName, Namespace: namespace}, project); err == nil {
				By("Cleanup the specific resource instance Project")
				Expect(k8sClient.Delete(ctx, project)).To(Succeed())
			}
		})

		It("should successfully create the resource", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetPolicy", mock.Anything, mock.Anything, mock.Anything).
				Return(nil, errors.NewNotFound(schema.GroupResource{}, policyName))
			fakeConsoleClient.On("CreatePolicy", mock.Anything, mock.MatchedBy(func(attrs gqlclient.PolicyAttributes) bool {
				return attrs.Name != nil && *attrs.Name == policyName &&
					attrs.Type != nil && *attrs.Type == gqlclient.PolicyTypeWorkbench &&
					attrs.Policy != nil && *attrs.Policy == rego &&
					attrs.ProjectID == nil
			})).Return(policyFragment(id, policyName), nil)

			reconciler := &controller.PolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &v1alpha1.Policy{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, policy)).To(Succeed())
			Expect(policy.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(policy.Status.SHA).NotTo(BeNil())
			Expect(common.SanitizeStatusConditions(policy.Status).Conditions).To(ContainElements(
				metav1.Condition{
					Type:    v1alpha1.ReadonlyConditionType.String(),
					Status:  metav1.ConditionFalse,
					Reason:  v1alpha1.ReadonlyConditionReason.String(),
					Message: "",
				},
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
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: policyName, Namespace: namespace},
			}, func(p *v1alpha1.Policy) {
				p.Spec.Description = lo.ToPtr("Updated workbench admission policy")
			})).To(Succeed())

			fragment := policyFragment(id, policyName)
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetPolicy", mock.Anything, mock.Anything, mock.Anything).Return(fragment, nil)
			fakeConsoleClient.On("UpdatePolicy", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.PolicyAttributes) bool {
				return attrs.Description != nil && *attrs.Description == "Updated workbench admission policy"
			})).Return(fragment, nil)

			reconciler := &controller.PolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertCalled(mocks.TestingT, "UpdatePolicy", mock.Anything, id, mock.Anything)
		})

		It("should create a policy scoped to a project", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetPolicy", mock.Anything, mock.Anything, mock.Anything).
				Return(nil, errors.NewNotFound(schema.GroupResource{}, projectPolicyName))
			fakeConsoleClient.On("CreatePolicy", mock.Anything, mock.MatchedBy(func(attrs gqlclient.PolicyAttributes) bool {
				return attrs.Name != nil && *attrs.Name == projectPolicyName &&
					attrs.ProjectID != nil && *attrs.ProjectID == projectID
			})).Return(policyFragment(projectPolicyID, projectPolicyName), nil)

			reconciler := &controller.PolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: projectPolicyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &v1alpha1.Policy{}
			Expect(k8sClient.Get(ctx, projectPolicyNamespacedName, policy)).To(Succeed())
			Expect(policy.Status.ID).To(Equal(lo.ToPtr(projectPolicyID)))
		})

		It("should reconcile an existing API policy in read-only mode", func() {
			fragment := policyFragment(readonlyID, readonlyPolicyName)
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetPolicy", mock.Anything, mock.Anything, mock.Anything).Return(fragment, nil)
			fakeConsoleClient.On("IsPolicyExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)

			reconciler := &controller.PolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: readonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &v1alpha1.Policy{}
			Expect(k8sClient.Get(ctx, readonlyNamespacedName, policy)).To(Succeed())
			Expect(policy.Status.ID).To(Equal(lo.ToPtr(readonlyID)))
			Expect(policy.Status.ReadOnly).To(BeTrue())
			Expect(common.SanitizeStatusConditions(policy.Status).Conditions).To(ContainElements(
				metav1.Condition{
					Type:    v1alpha1.ReadonlyConditionType.String(),
					Status:  metav1.ConditionTrue,
					Reason:  v1alpha1.ReadonlyConditionReason.String(),
					Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
				},
				metav1.Condition{
					Type:   v1alpha1.ReadyConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.ReadyConditionReason.String(),
				},
				metav1.Condition{
					Type:   v1alpha1.SynchronizedConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.SynchronizedConditionReason.String(),
				},
			))
		})

		It("should successfully delete the resource", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Policy{
				ObjectMeta: metav1.ObjectMeta{Name: policyName, Namespace: namespace},
			}, func(p *v1alpha1.Policy) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			resource := &v1alpha1.Policy{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsPolicyExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("DeletePolicy", mock.Anything, id).Return(nil)

			reconciler := &controller.PolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &v1alpha1.Policy{}
			err = k8sClient.Get(ctx, typeNamespacedName, policy)
			Expect(err.Error()).To(Equal("policies.deployments.plural.sh \"policy-controller-test\" not found"))
		})
	})
})
