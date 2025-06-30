package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("Postgres User Controller", func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName   = "test-postgres-user"
			namespace      = "default"
			userSecretName = "test-postgres-user-secret"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}
		user := &v1alpha1.PostgresUser{}
		credential := &v1alpha1.PostgresCredentials{}
		secret := &v1.Secret{}

		BeforeEach(func() {
			err := k8sClient.Get(ctx, types.NamespacedName{Namespace: namespace, Name: userSecretName}, secret)
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name:      userSecretName,
						Namespace: namespace,
					},
					Data: map[string][]byte{
						"password": []byte("mock"),
					},
				}, nil)).To(Succeed())
			}
			By("creating the custom resource for the Kind PostgresCredentials")
			err = k8sClient.Get(ctx, typeNamespacedName, credential)
			if err != nil && errors.IsNotFound(err) {
				credentials := &v1alpha1.PostgresCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.PostgresCredentialsSpec{
						Host:     "127.0.0.1",
						Port:     0,
						Database: "test",
						Username: "test",
						PasswordSecretKeyRef: v1.SecretKeySelector{
							LocalObjectReference: v1.LocalObjectReference{
								Name: resourceName,
							},
							Key: "password",
						},
					},
				}
				Expect(k8sClient.Create(ctx, credentials)).To(Succeed())
				Expect(common.MaybePatch(k8sClient, &v1alpha1.PostgresCredentials{
					ObjectMeta: metav1.ObjectMeta{Name: resourceName, Namespace: namespace},
				}, func(p *v1alpha1.PostgresCredentials) {
					p.Status.Conditions = []metav1.Condition{
						{
							Type:               v1alpha1.ReadyConditionType.String(),
							Status:             metav1.ConditionTrue,
							Reason:             v1alpha1.ReadyConditionReason.String(),
							Message:            "",
							LastTransitionTime: metav1.Time{Time: metav1.Now().Time},
						},
					}
				})).To(Succeed())
			}

			By("creating the custom resource for the Kind PostgresUser")
			err = k8sClient.Get(ctx, typeNamespacedName, user)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.PostgresUser{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.PostgresUserSpec{
						CredentialsRef: v1.LocalObjectReference{
							Name: resourceName}, // Not required for this test.
						PasswordSecretKeyRef: v1.SecretKeySelector{
							LocalObjectReference: v1.LocalObjectReference{
								Name: userSecretName,
							},
							Key: "password",
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &v1alpha1.PostgresUser{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance PostgresUser")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			secret := &v1.Secret{}
			err = k8sClient.Get(ctx, types.NamespacedName{Namespace: namespace, Name: userSecretName}, secret)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Secret")
			Expect(k8sClient.Delete(ctx, secret)).To(Succeed())

		})
		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")

			expectedStatus := v1alpha1.Status{
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadyConditionReason.String(),
						Message: "",
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
				},
			}

			fakePostgresClient := mocks.NewClientMock(mocks.TestingT)
			fakePostgresClient.On("Init", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			fakePostgresClient.On("UpsertUser", mock.Anything, mock.Anything).Return(nil)

			controllerReconciler := &controller.PostgresUserReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				PostgresClient: fakePostgresClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			user := &v1alpha1.PostgresUser{}
			err = k8sClient.Get(ctx, typeNamespacedName, user)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(user.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
