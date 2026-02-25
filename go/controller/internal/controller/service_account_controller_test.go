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
	"github.com/pluralsh/console/go/controller/internal/credentials"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const serviceAccountScopeHashAnnotation = "deployments.plural.sh/last-scope-hash"

var _ = Describe("ServiceAccount Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			saName            = "service-account-test"
			saUpdateName      = "service-account-update"
			saReadonlyName    = "service-account-readonly"
			namespace         = "default"
			email             = "sa-test@example.com"
			updateEmail       = "sa-update@example.com"
			readonlyEmail     = "sa-readonly@example.com"
			id                = "sa-123"
			updateID          = "sa-456"
			readonlyID        = "sa-789"
			tokenSecretName   = "service-account-token"
			updateSecretName  = "service-account-token-update"
			tokenValue        = "token-123"
			updatedTokenValue = "token-456"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{Name: saName, Namespace: namespace}
		updateNamespacedName := types.NamespacedName{Name: saUpdateName, Namespace: namespace}
		readonlyNamespacedName := types.NamespacedName{Name: saReadonlyName, Namespace: namespace}
		tokenSecretNamespacedName := types.NamespacedName{Name: tokenSecretName, Namespace: namespace}
		updateSecretNamespacedName := types.NamespacedName{Name: updateSecretName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the custom resources for the Kind ServiceAccount")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      saName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ServiceAccountSpec{
					Email: email,
					TokenSecretRef: &corev1.SecretReference{
						Name:      tokenSecretName,
						Namespace: namespace,
					},
				},
			}, nil)).To(Succeed())

			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      saUpdateName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ServiceAccountSpec{
					Email: updateEmail,
					TokenSecretRef: &corev1.SecretReference{
						Name:      updateSecretName,
						Namespace: namespace,
					},
				},
			}, nil)).To(Succeed())

			drift := false
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      saReadonlyName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ServiceAccountSpec{
					Email: readonlyEmail,
					Reconciliation: &v1alpha1.Reconciliation{
						DriftDetection: &drift,
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			for _, name := range []types.NamespacedName{typeNamespacedName, updateNamespacedName, readonlyNamespacedName} {
				sa := &v1alpha1.ServiceAccount{}
				if err := k8sClient.Get(ctx, name, sa); err == nil {
					By("Cleanup the specific resource instance ServiceAccount")
					Expect(k8sClient.Delete(ctx, sa)).To(Succeed())
				}
			}

			for _, name := range []types.NamespacedName{tokenSecretNamespacedName, updateSecretNamespacedName} {
				secret := &corev1.Secret{}
				if err := k8sClient.Get(ctx, name, secret); err == nil {
					Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
				}
			}
		})

		It("should successfully reconcile the resource and create token secret", func() {
			test := struct {
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID: lo.ToPtr(id),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.ReadyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.ReadyTokenConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadyTokenConditionReason.String(),
							Message: "",
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
			}

			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, tokenSecretNamespacedName, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceAccount", mock.Anything, email).Return(nil, errors.NewNotFound(schema.GroupResource{}, email)).Twice()
			fakeConsoleClient.On("IsServiceAccountExists", mock.Anything, mock.Anything).Return(false, nil)
			fakeConsoleClient.On("CreateServiceAccount", mock.Anything, mock.Anything).Return(&gqlclient.UserFragment{ID: id}, nil)
			fakeConsoleClient.On("CreateServiceAccountToken", mock.Anything, id, mock.Anything, mock.Anything).
				Return(&gqlclient.AccessTokenFragment{Token: lo.ToPtr(tokenValue)}, nil)

			reconciler := &controller.ServiceAccountReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			sa := &v1alpha1.ServiceAccount{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, sa)).To(Succeed())
			Expect(sa.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(sa.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = sa.Status.SHA
			Expect(common.SanitizeStatusConditions(sa.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

			createdSecret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, tokenSecretNamespacedName, createdSecret)).To(Succeed())
			Expect(createdSecret.Data[credentials.CredentialsSecretTokenKey]).To(Equal([]byte(tokenValue)))
			Expect(createdSecret.OwnerReferences).NotTo(BeEmpty())
		})

		It("should update token secret when scopes change", func() {
			scopeAPI := "service.write"

			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      updateSecretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					credentials.CredentialsSecretTokenKey: []byte("old-token"),
				},
			}, nil)).To(Succeed())

			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{Name: saUpdateName, Namespace: namespace},
			}, func(sa *v1alpha1.ServiceAccount) {
				sa.Spec.Scopes = []v1alpha1.ServiceAccountScope{
					{API: &scopeAPI},
				}
				if sa.Annotations == nil {
					sa.Annotations = map[string]string{}
				}
				sa.Annotations[serviceAccountScopeHashAnnotation] = "stale-hash"
			})).To(Succeed())

			Expect(common.MaybePatch(k8sClient, &v1alpha1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{Name: saUpdateName, Namespace: namespace},
			}, func(sa *v1alpha1.ServiceAccount) {
				sa.Status.ID = lo.ToPtr(updateID)
				sa.Status.SHA = lo.ToPtr("old-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceAccount", mock.Anything, updateEmail).Return(&gqlclient.UserFragment{ID: updateID}, nil).Twice()
			fakeConsoleClient.On("UpdateServiceAccount", mock.Anything, updateID, mock.Anything).Return(&gqlclient.UserFragment{ID: updateID}, nil)
			fakeConsoleClient.On("CreateServiceAccountToken", mock.Anything, updateID, mock.Anything, mock.Anything).
				Return(&gqlclient.AccessTokenFragment{Token: lo.ToPtr(updatedTokenValue)}, nil)

			reconciler := &controller.ServiceAccountReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: updateNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			secret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, updateSecretNamespacedName, secret)).To(Succeed())
			Expect(secret.Data[credentials.CredentialsSecretTokenKey]).To(Equal([]byte(updatedTokenValue)))

			sa := &v1alpha1.ServiceAccount{}
			Expect(k8sClient.Get(ctx, updateNamespacedName, sa)).To(Succeed())
			scopeHash, err := utils.HashObject(sa.Spec.Scopes)
			Expect(err).NotTo(HaveOccurred())
			Expect(sa.Annotations[serviceAccountScopeHashAnnotation]).To(Equal(scopeHash))
		})

		It("should reconcile readonly resource", func() {
			test := struct {
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:       lo.ToPtr(readonlyID),
					ReadOnly: true,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
						},
					},
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceAccount", mock.Anything, readonlyEmail).Return(&gqlclient.UserFragment{ID: readonlyID}, nil).Twice()
			fakeConsoleClient.On("IsServiceAccountExists", mock.Anything, readonlyEmail).Return(true, nil)

			reconciler := &controller.ServiceAccountReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: readonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			sa := &v1alpha1.ServiceAccount{}
			Expect(k8sClient.Get(ctx, readonlyNamespacedName, sa)).To(Succeed())
			Expect(sa.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(common.SanitizeStatusConditions(sa.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
	})
})
