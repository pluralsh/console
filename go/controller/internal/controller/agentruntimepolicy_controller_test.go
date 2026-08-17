package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
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

var _ = Describe("AgentRuntimePolicy Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			policyName    = "claude"
			namespace     = "default"
			id            = "runtime-123"
			clusterID     = "cluster-123"
			clusterHandle = "mgmt"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: policyName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the custom resource for the Kind AgentRuntimePolicy")
			policy := &v1alpha1.AgentRuntimePolicy{}
			err := k8sClient.Get(ctx, typeNamespacedName, policy)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.AgentRuntimePolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      policyName,
						Namespace: namespace,
					},
					Spec: v1alpha1.AgentRuntimePolicySpec{
						Runtime: lo.ToPtr(policyName),
						Bindings: &v1alpha1.AgentRuntimePolicyBindings{
							Create: []v1alpha1.Binding{
								{UserEmail: lo.ToPtr("admin@plural.sh")},
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			policy := &v1alpha1.AgentRuntimePolicy{}
			if err := k8sClient.Get(ctx, typeNamespacedName, policy); err == nil {
				By("Cleanup the specific resource instance AgentRuntimePolicy")
				Expect(k8sClient.Delete(ctx, policy)).To(Succeed())
			}
		})

		It("should upsert the runtime with policy create bindings", func() {
			runtimeFragment := &gqlclient.AgentRuntimeFragment{
				ID:   id,
				Name: policyName,
				Type: gqlclient.AgentRuntimeTypeClaude,
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", lo.ToPtr(clusterHandle)).Return(&gqlclient.ClusterFragment{
				ID:     clusterID,
				Handle: lo.ToPtr(clusterHandle),
			}, nil)
			fakeConsoleClient.On("GetAgentRuntime", mock.Anything, policyName, clusterID).Return(runtimeFragment, nil)
			fakeConsoleClient.On("UpsertAgentRuntime", mock.Anything, mock.MatchedBy(func(attrs gqlclient.AgentRuntimeAttributes) bool {
				return attrs.Name == policyName &&
					attrs.Type == gqlclient.AgentRuntimeTypeClaude &&
					attrs.ClusterID != nil && *attrs.ClusterID == clusterID &&
					attrs.AiProxy == nil &&
					attrs.Default == nil &&
					attrs.AllowedRepositories == nil &&
					attrs.BabysitInterval == nil &&
					len(attrs.CreateBindings) == 1 &&
					attrs.CreateBindings[0].UserEmail != nil &&
					*attrs.CreateBindings[0].UserEmail == "admin@plural.sh"
			})).Return(runtimeFragment, nil)

			reconciler := &controller.AgentRuntimePolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &v1alpha1.AgentRuntimePolicy{}
			err = k8sClient.Get(ctx, typeNamespacedName, policy)
			Expect(err).NotTo(HaveOccurred())
			Expect(policy.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(policy.Status.SHA).NotTo(BeNil())
			Expect(common.SanitizeStatusConditions(policy.Status).Conditions).To(ContainElements(
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

		It("should wait when the agent runtime is missing", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetClusterByHandle", lo.ToPtr(clusterHandle)).Return(&gqlclient.ClusterFragment{
				ID:     clusterID,
				Handle: lo.ToPtr(clusterHandle),
			}, nil)
			fakeConsoleClient.On("GetAgentRuntime", mock.Anything, policyName, clusterID).Return(
				nil, errors.NewNotFound(schema.GroupResource{}, policyName),
			)

			reconciler := &controller.AgentRuntimePolicyReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
		})
	})
})
