package controller_test

import (
	"context"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/stretchr/testify/mock"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	dbsv1alpha1 "github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
)

var _ = Describe("PostgresCredentials Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-postgres-credentials"
		const namespace = "default"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"password": []byte("mock"),
				},
			}, nil)).To(Succeed())

			postgresCredential := &dbsv1alpha1.PostgresCredentials{}
			By("creating the custom resource for the Kind PostgresCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, postgresCredential)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.PostgresCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: dbsv1alpha1.PostgresCredentialsSpec{
						Host:     "127.0.0.1",
						Port:     0,
						Database: "test",
						Username: "test",
						PasswordSecretKeyRef: corev1.SecretKeySelector{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: resourceName,
							},
							Key: "password",
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &dbsv1alpha1.PostgresCredentials{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance PostgresCredentials")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			secret := &corev1.Secret{}
			err = k8sClient.Get(ctx, typeNamespacedName, secret)
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
			fakePostgresClient.On("Ping").Return(nil)

			controllerReconciler := &controller.PostgresCredentialsReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				PostgresClient: fakePostgresClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			cred := &v1alpha1.PostgresCredentials{}
			err = k8sClient.Get(ctx, typeNamespacedName, cred)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(cred.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
