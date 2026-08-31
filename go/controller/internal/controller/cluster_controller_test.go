package controller_test

import (
	"context"
	"sort"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/internal/identity"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/internal/credentials"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

const namespace = "default"

func sanitizeClusterStatus(status v1alpha1.ClusterStatus) v1alpha1.ClusterStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

	return status
}

var _ = Describe("Cluster Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			byokReadonlyClusterName      = "byok-readonly-cluster"
			byokReadonlyClusterConsoleID = "byok-readonly-cluster-console-id"
		)

		ctx := context.Background()
		byokReadonlyNamespacedName := types.NamespacedName{Name: byokReadonlyClusterName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating BYOK cluster that will adopt existing Console resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      byokReadonlyClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(byokReadonlyClusterName),
					Cloud:  "byok",
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup BYOK readonly cluster")
			byokReadonlyCluster := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, byokReadonlyNamespacedName, byokReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokReadonlyCluster)).To(Succeed())
		})

		It("should successfully reconcile BYOK readonly cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:       lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA:      lo.ToPtr("KUEGIQWRYFJEEYRIYV5KIVVWP6AWD66YSD3AODQ54VEIM27IX44A===="),
					ReadOnly: true,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
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
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})

		It("should successfully update readonly cluster bindings", func() {
			cluster := &v1alpha1.Cluster{}
			Expect(k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)).NotTo(HaveOccurred())
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: byokReadonlyClusterName, Namespace: namespace},
			}, func(stack *v1alpha1.Cluster) {
				stack.Spec.Bindings = &v1alpha1.Bindings{
					Read: []v1alpha1.Binding{
						{
							UserEmail: lo.ToPtr("test@plural.sh"),
						},
					},
				}
			})).To(Succeed())

			cacheConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			cacheConsoleClient.On("GetUserId", mock.Anything).Return("id", nil)
			identity.ResetCache(cacheConsoleClient)

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:       lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA:      lo.ToPtr("QEFWK4PFO6XYSBXXXLRFYEF6FTBAEGSJU2ID3R43IZ2QL4VNVOTQ===="),
					ReadOnly: true,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
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
				CurrentVersion: lo.ToPtr("1.24.11"),
			})))
		})

		It("should requeue after get bindings error", func() {
			cacheConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			cacheConsoleClient.On("GetUserId", mock.Anything).Return("", errors.NewNotFound(schema.GroupResource{}, "user"))
			identity.ResetCache(cacheConsoleClient)

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			result, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})
	})
})

func tagMap(tags []*gqlclient.TagAttributes) map[string]string {
	result := map[string]string{}
	for _, tag := range tags {
		if tag == nil {
			continue
		}
		result[tag.Name] = tag.Value
	}
	return result
}

var _ = Describe("Cluster Controller mergeTags", Ordered, func() {
	Context("when reconciling a tracked cluster", func() {
		const (
			mergeTagsClusterName         = "merge-tags-cluster"
			mergeTagsClusterConsoleID    = "merge-tags-cluster-console-id"
			replaceTagsClusterName       = "replace-tags-cluster"
			replaceTagsClusterConsoleID  = "replace-tags-cluster-console-id"
			preserveTagsClusterName      = "preserve-tags-cluster"
			preserveTagsClusterConsoleID = "preserve-tags-cluster-console-id"
		)

		ctx := context.Background()
		mergeTagsNamespacedName := types.NamespacedName{Name: mergeTagsClusterName, Namespace: namespace}
		replaceTagsNamespacedName := types.NamespacedName{Name: replaceTagsClusterName, Namespace: namespace}
		preserveTagsNamespacedName := types.NamespacedName{Name: preserveTagsClusterName, Namespace: namespace}

		existingAPITags := []*gqlclient.ClusterTags{
			{Name: "env", Value: "prod"},
			{Name: "team", Value: "platform"},
		}

		BeforeAll(func() {
			By("Creating cluster that merges tags with the tracked Console cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      mergeTagsClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:    lo.ToPtr(mergeTagsClusterName),
					Cloud:     "byok",
					MergeTags: true,
					Tags: map[string]string{
						"team":   "infra",
						"region": "us-east",
					},
				},
			}, nil)).To(Succeed())

			By("Creating cluster that replaces tags on the tracked Console cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      replaceTagsClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(replaceTagsClusterName),
					Cloud:  "byok",
					Tags: map[string]string{
						"region": "us-east",
					},
				},
			}, nil)).To(Succeed())

			By("Creating cluster that preserves existing Console tags when the CR specifies none")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      preserveTagsClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:    lo.ToPtr(preserveTagsClusterName),
					Cloud:     "byok",
					MergeTags: true,
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup merge and replace tag clusters")
			for _, name := range []types.NamespacedName{mergeTagsNamespacedName, replaceTagsNamespacedName, preserveTagsNamespacedName} {
				cluster := &v1alpha1.Cluster{}
				Expect(k8sClient.Get(ctx, name, cluster)).NotTo(HaveOccurred())
				Expect(k8sClient.Delete(ctx, cluster)).To(Succeed())
			}
		})

		It("should merge existing Console tags with CR tags when mergeTags is true", func() {
			var captured gqlclient.ClusterUpdateAttributes
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             mergeTagsClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
				Tags:           existingAPITags,
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
				captured = args.Get(1).(gqlclient.ClusterUpdateAttributes)
			}).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: mergeTagsNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(tagMap(captured.Tags)).To(Equal(map[string]string{
				"env":    "prod",
				"team":   "infra",
				"region": "us-east",
			}))

			cluster := &v1alpha1.Cluster{}
			Expect(k8sClient.Get(ctx, mergeTagsNamespacedName, cluster)).NotTo(HaveOccurred())
			Expect(cluster.Status.ID).To(Equal(lo.ToPtr(mergeTagsClusterConsoleID)))
			Expect(cluster.Status.ReadOnly).To(BeTrue())
			Expect(cluster.Status.PrevTags).To(Equal(map[string]string{
				"team":   "infra",
				"region": "us-east",
			}))
			fakeConsoleClient.AssertCalled(GinkgoT(), "UpdateCluster", mergeTagsClusterConsoleID, mock.Anything)
		})

		It("should drop tags removed from the CR while preserving external Console tags", func() {
			cluster := &v1alpha1.Cluster{}
			Expect(k8sClient.Get(ctx, mergeTagsNamespacedName, cluster)).NotTo(HaveOccurred())
			cluster.Spec.Tags = map[string]string{"team": "infra"}
			Expect(k8sClient.Update(ctx, cluster)).To(Succeed())

			var captured gqlclient.ClusterUpdateAttributes
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             mergeTagsClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
				Tags: []*gqlclient.ClusterTags{
					{Name: "env", Value: "prod"},
					{Name: "team", Value: "infra"},
					{Name: "region", Value: "us-east"},
				},
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
				captured = args.Get(1).(gqlclient.ClusterUpdateAttributes)
			}).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: mergeTagsNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(tagMap(captured.Tags)).To(Equal(map[string]string{
				"env":  "prod",
				"team": "infra",
			}))

			Expect(k8sClient.Get(ctx, mergeTagsNamespacedName, cluster)).NotTo(HaveOccurred())
			Expect(cluster.Status.PrevTags).To(Equal(map[string]string{
				"team": "infra",
			}))
		})

		It("should replace tags when mergeTags is false", func() {
			var captured gqlclient.ClusterUpdateAttributes
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             replaceTagsClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
				Tags:           existingAPITags,
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
				captured = args.Get(1).(gqlclient.ClusterUpdateAttributes)
			}).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: replaceTagsNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(tagMap(captured.Tags)).To(Equal(map[string]string{
				"region": "us-east",
			}))

			cluster := &v1alpha1.Cluster{}
			Expect(k8sClient.Get(ctx, replaceTagsNamespacedName, cluster)).NotTo(HaveOccurred())
			Expect(cluster.Status.ID).To(Equal(lo.ToPtr(replaceTagsClusterConsoleID)))
			Expect(cluster.Status.ReadOnly).To(BeTrue())
			fakeConsoleClient.AssertCalled(GinkgoT(), "UpdateCluster", replaceTagsClusterConsoleID, mock.Anything)
		})

		It("should preserve existing Console tags when mergeTags is true and the CR has no tags", func() {
			var captured gqlclient.ClusterUpdateAttributes
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             preserveTagsClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
				Tags:           existingAPITags,
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
				captured = args.Get(1).(gqlclient.ClusterUpdateAttributes)
			}).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: preserveTagsNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(tagMap(captured.Tags)).To(Equal(map[string]string{
				"env":  "prod",
				"team": "platform",
			}))
		})
	})
})
