package controller_test

import (
	"context"
	"sort"

	"github.com/Yamashou/gqlgenc/clientv2"
	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/vektah/gqlparser/v2/gqlerror"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
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
			awsProviderName              = "aws-provider"
			awsProviderConsoleID         = "aws-provider-console-id"
			awsClusterName               = "aws-cluster"
			awsClusterConsoleID          = "aws-cluster-console-id"
			byokClusterName              = "byok-cluster"
			byokClusterConsoleID         = "byok-cluster-console-id"
			awsReadonlyClusterName       = "aws-readonly-cluster"
			awsReadonlyClusterConsoleID  = "aws-readonly-cluster-console-id"
			byokReadonlyClusterName      = "byok-readonly-cluster"
			byokReadonlyClusterConsoleID = "byok-readonly-cluster-console-id"
		)

		ctx := context.Background()
		awsNamespacedName := types.NamespacedName{Name: awsClusterName, Namespace: namespace}
		byokNamespacedName := types.NamespacedName{Name: byokClusterName, Namespace: namespace}
		awsReadonlyNamespacedName := types.NamespacedName{Name: awsReadonlyClusterName, Namespace: namespace}
		byokReadonlyNamespacedName := types.NamespacedName{Name: byokReadonlyClusterName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating AWS provider")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{Name: awsProviderName},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "aws",
					Name:  awsProviderName,
				},
			}, func(p *v1alpha1.Provider) {
				p.Status.ID = lo.ToPtr(awsProviderConsoleID)
			})).To(Succeed())

			By("Creating AWS cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      awsClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:      lo.ToPtr(awsClusterName),
					Version:     lo.ToPtr("1.24"),
					Cloud:       "aws",
					ProviderRef: &corev1.ObjectReference{Name: awsProviderName},
				},
			}, nil)).To(Succeed())

			By("Creating BYOK cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      byokClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(byokClusterName),
					Cloud:  "byok",
				},
			}, nil)).To(Succeed())

			By("Creating AWS cluster that will adopt existing Console resource")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      awsReadonlyClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle: lo.ToPtr(awsReadonlyClusterName),
					Cloud:  "aws",
				},
			}, nil)).To(Succeed())

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
			By("Cleanup AWS cluster")
			awsCluster := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, awsNamespacedName, awsCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, awsCluster)).To(Succeed())

			By("Cleanup BYOK cluster")
			byokCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, byokCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokCluster)).To(Succeed())

			By("Cleanup AWS readonly cluster")
			awsReadonlyCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsReadonlyNamespacedName, awsReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, awsReadonlyCluster)).To(Succeed())

			By("Cleanup BYOK readonly cluster")
			byokReadonlyCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, byokReadonlyCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, byokReadonlyCluster)).To(Succeed())
		})

		It("should successfully reconcile AWS cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, awsClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false, nil)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: awsClusterConsoleID}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(awsClusterConsoleID),
					SHA: lo.ToPtr("V4CSBG6ZI7G3HQQD2HXZODXSHVB7YJ4MNF3UW5LXAEZV6TMU5PHA===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
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
			})))
		})

		It("should successfully reconcile and update previously created AWS cluster", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: awsClusterName, Namespace: "default"},
			}, func(p *v1alpha1.Cluster) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(true, nil)
			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(
				&gqlclient.ClusterFragment{ID: awsClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				CurrentVersion: lo.ToPtr("1.25.6"),
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(awsClusterConsoleID),
					SHA: lo.ToPtr("V4CSBG6ZI7G3HQQD2HXZODXSHVB7YJ4MNF3UW5LXAEZV6TMU5PHA===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
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
			})))
		})

		It("should successfully reconcile and update metadata od previously created AWS cluster", func() {
			metadata := `{"a":"b"}`
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: awsClusterName, Namespace: "default"},
			}, func(p *v1alpha1.Cluster) {
				p.Spec.Metadata = &runtime.RawExtension{Raw: []byte(metadata)}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(true, nil)
			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(
				&gqlclient.ClusterFragment{ID: awsClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				CurrentVersion: lo.ToPtr("1.25.6"),
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(awsClusterConsoleID),
					SHA: lo.ToPtr("P3LOSP3TFWSC6JPNBUENRB4PIG3N2WN6RSJ5TLSRZRQFPV6AL54Q===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
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
			})))
		})

		It("should successfully reconcile BYOK cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(nil, errors.NewNotFound(schema.GroupResource{}, byokClusterName))
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(false, nil)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(&gqlclient.ClusterFragment{ID: byokClusterConsoleID}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
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
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonNotFound.String(),
							Message: "Could not find Cluster in Console API",
						},
					},
				},
			})))
		})

		It("should successfully reconcile and update previously created BYOK cluster", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: byokClusterName, Namespace: "default"},
			}, func(p *v1alpha1.Cluster) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{ID: byokClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(true, nil)
			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(
				&gqlclient.ClusterFragment{ID: byokClusterConsoleID, CurrentVersion: lo.ToPtr("1.25.6")}, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, byokNamespacedName, cluster)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				CurrentVersion: lo.ToPtr("1.25.6"),
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(byokClusterConsoleID),
					SHA: lo.ToPtr("CPYLCGRGF2JWFBF3OGRHQQUSBDXW6Y4VMUDQDCQQDEA6G6CAZORQ===="),
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
			})))
		})

		It("should successfully reconcile AWS readonly cluster", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             awsReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)
			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: awsReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, awsReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(awsReadonlyClusterConsoleID),
					SHA: lo.ToPtr("L3KK4BYJRB2JTXZVEU6NBBLEQUHLTNVQE2OHMRNDJBY6WKZFFA4A===="),
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
					ID:  lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA: lo.ToPtr("KUEGIQWRYFJEEYRIYV5KIVVWP6AWD66YSD3AODQ54VEIM27IX44A===="),
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

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(&gqlclient.UserFragment{ID: "id"}, nil)
			fakeConsoleClient.On("UpdateCluster", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
				UserGroupCache:   cache.NewUserGroupCache(fakeConsoleClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			err = k8sClient.Get(ctx, byokReadonlyNamespacedName, cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeClusterStatus(cluster.Status)).To(Equal(sanitizeClusterStatus(v1alpha1.ClusterStatus{
				Status: v1alpha1.Status{
					ID:  lo.ToPtr(byokReadonlyClusterConsoleID),
					SHA: lo.ToPtr("QEFWK4PFO6XYSBXXXLRFYEF6FTBAEGSJU2ID3R43IZ2QL4VNVOTQ===="),
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
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(&gqlclient.ClusterFragment{
				ID:             byokReadonlyClusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			}, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(nil, &clientv2.ErrorResponse{
				GqlErrors: &gqlerror.List{gqlerror.Errorf("%s", "could not find resource")},
			})

			controllerReconciler := &controller.ClusterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
				UserGroupCache:   cache.NewUserGroupCache(fakeConsoleClient),
			}

			result, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: byokReadonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})
	})
})
