package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("Helm Repository Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			secretName         = "secret-name"
			helmRepositoryName = "helm-repository-test"
			namespace          = "default"
			id                 = "123"
			url                = "https://github.com/test"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      helmRepositoryName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the token secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte("secret"),
				},
			}, nil)).To(Succeed())

			By("creating the Helm repository")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.HelmRepository{
				ObjectMeta: metav1.ObjectMeta{
					Name:      helmRepositoryName,
					Namespace: namespace,
				},
				Spec: v1alpha1.HelmRepositorySpec{
					URL:      url,
					Provider: lo.ToPtr(gqlclient.HelmAuthProviderBearer),
					Auth: &v1alpha1.HelmRepositoryAuth{
						Bearer: &v1alpha1.HelmRepositoryAuthBearer{
							TokenSecretRef: &corev1.SecretReference{
								Name:      secretName,
								Namespace: namespace,
							},
						},
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			secret := &corev1.Secret{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret)
			Expect(err).NotTo(HaveOccurred())
			By("cleanup the token secret")
			Expect(k8sClient.Delete(ctx, secret)).To(Succeed())

			helmRepository := &v1alpha1.HelmRepository{}
			err = k8sClient.Get(ctx, types.NamespacedName{Name: helmRepositoryName, Namespace: namespace}, helmRepository)
			Expect(err).NotTo(HaveOccurred())
			By("cleanup the Helm repository")
			Expect(k8sClient.Delete(ctx, helmRepository)).To(Succeed())
		})

		It("should successfully reconcile the resource Helm repository", func() {
			By("Create Helm repository")
			test := struct {
				returnedFragment *gqlclient.HelmRepositoryFragment
				expectedStatus   v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("B7YGLLWIRQDICWPPOGFZBH2DUGVN6B2J3YKF7NLFPDZABUDJZALA===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: "",
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
				returnedFragment: &gqlclient.HelmRepositoryFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetHelmRepository", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, helmRepositoryName))
			fakeConsoleClient.On("IsHelmRepositoryExists", mock.Anything, mock.Anything).Return(false, nil)
			fakeConsoleClient.On("UpsertHelmRepository", mock.Anything, mock.Anything, mock.Anything).Return(test.returnedFragment, nil)
			reconciler := &controller.HelmRepositoryReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
				HelmRepositoryAuth: &controller.HelmRepositoryAuth{
					Client: k8sClient,
					Scheme: k8sClient.Scheme(),
				},
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.HelmRepository{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile and update previously created Helm repository", func() {
			test := struct {
				returnedFragment *gqlclient.HelmRepositoryFragment
				expectedStatus   v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("HQX7M3MVLIY33UQTRC747CLQX5U424VCAPF4QJ3CNW4I7LWGJAOQ===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: "",
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
				returnedFragment: &gqlclient.HelmRepositoryFragment{
					ID: id,
				},
			}

			Expect(common.MaybePatchObject(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{Name: secretName, Namespace: namespace},
			}, func(secret *corev1.Secret) {
				secret.Data = map[string][]byte{
					"token": []byte("updated"),
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsHelmRepositoryExists", mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("GetHelmRepository", mock.Anything, mock.Anything).Return(test.returnedFragment, nil)
			fakeConsoleClient.On("UpsertHelmRepository", mock.Anything, mock.Anything, mock.Anything).Return(test.returnedFragment, nil)

			reconciler := &controller.HelmRepositoryReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
				HelmRepositoryAuth: &controller.HelmRepositoryAuth{
					Client: k8sClient,
					Scheme: k8sClient.Scheme(),
				},
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.HelmRepository{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
	})
})
