package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Provider Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			providerName              = "provider"
			providerSecretName        = "credentials"
			providerSecretNamespace   = "default"
			providerConsoleID         = "provider-console-id"
			readonlyProviderName      = "readonly-provider"
			readonlyProviderConsoleID = "readonly-provider-console-id"
		)

		ctx := context.Background()
		namespacedName := types.NamespacedName{Name: providerName}
		readonlyNamespacedName := types.NamespacedName{Name: readonlyProviderName}

		BeforeAll(func() {
			By("Creating provider secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      providerSecretName,
					Namespace: providerSecretNamespace,
				},
				Data: map[string][]byte{
					"applicationCredentials": []byte("mock"),
				},
			}, nil)).To(Succeed())

			By("Creating provider")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{
					Name: providerName,
				},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "gcp",
					CloudSettings: &v1alpha1.CloudProviderSettings{
						GCP: &corev1.SecretReference{
							Name:      providerSecretName,
							Namespace: providerSecretNamespace,
						},
					},
					Name:      providerName,
					Namespace: "gcp",
				},
			}, func(p *v1alpha1.Provider) {
				p.Status.ID = lo.ToPtr(providerConsoleID)
			})).To(Succeed())

			By("Creating readonly provider")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{
					Name: readonlyProviderName,
				},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "aws",
					Name:  "aws",
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup provider")
			provider := &v1alpha1.Provider{}
			err := k8sClient.Get(ctx, namespacedName, provider)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, provider)).To(Succeed())

			By("Cleanup readonly provider")
			readonlyProvider := &v1alpha1.Provider{}
			err = k8sClient.Get(ctx, namespacedName, readonlyProvider)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, readonlyProvider)).To(Succeed())
		})

		It("should successfully reconcile provider", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetProviderByCloud", mock.Anything, v1alpha1.GCP).Return(nil, errors.NewNotFound(schema.GroupResource{}, providerName))
			fakeConsoleClient.On("IsProviderExists", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("CreateProvider", mock.Anything, mock.Anything).Return(&gqlclient.ClusterProviderFragment{
				ID:        providerConsoleID,
				Name:      providerName,
				Namespace: "gcp",
				Cloud:     "gcp",
			}, nil)

			controllerReconciler := &controller.ProviderReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			provider := &v1alpha1.Provider{}
			err = k8sClient.Get(ctx, namespacedName, provider)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(provider.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(providerConsoleID),
				SHA: lo.ToPtr("QL7PGU67IFKWWO4A7AU33D2HCTSGG4GGXR32DZXNPE6GDBHLXUSQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile and update previously created provider", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{Name: providerName, Namespace: "default"},
			}, func(p *v1alpha1.Provider) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsProviderExists", mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("UpdateProvider", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.ClusterProviderFragment{
				ID:        providerConsoleID,
				Name:      providerName,
				Namespace: "gcp",
				Cloud:     "gcp",
			}, nil)

			controllerReconciler := &controller.ProviderReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			provider := &v1alpha1.Provider{}
			err = k8sClient.Get(ctx, namespacedName, provider)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(provider.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(providerConsoleID),
				SHA: lo.ToPtr("QL7PGU67IFKWWO4A7AU33D2HCTSGG4GGXR32DZXNPE6GDBHLXUSQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile readonly provider", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetProviderByCloud", mock.Anything, v1alpha1.AWS).Return(&gqlclient.ClusterProviderFragment{
				ID:        readonlyProviderConsoleID,
				Name:      readonlyProviderName,
				Namespace: "aws",
				Cloud:     "aws",
			}, nil)

			controllerReconciler := &controller.ProviderReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: readonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			provider := &v1alpha1.Provider{}
			err = k8sClient.Get(ctx, readonlyNamespacedName, provider)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(provider.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID: lo.ToPtr(readonlyProviderConsoleID),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadonlyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadonlyConditionReason.String(),
						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
				},
			})))
		})
	})
})
