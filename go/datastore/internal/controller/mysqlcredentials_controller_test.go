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

var _ = Describe("MySqlCredentials Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-mysql-credentials"
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

			mysqlCredential := &dbsv1alpha1.MySqlCredentials{}
			By("creating the custom resource for the Kind MySqlCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, mysqlCredential)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.MySqlCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: dbsv1alpha1.MySqlCredentialsSpec{
						Host:     "127.0.0.1",
						Port:     0,
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
			resource := &dbsv1alpha1.MySqlCredentials{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance MySqlCredentials")
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

			fakeClient := mocks.NewMySqlClientMock(mocks.TestingT)
			fakeClient.On("Init", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			fakeClient.On("Ping").Return(nil)

			controllerReconciler := &controller.MySqlCredentialsReconciler{
				Client:      k8sClient,
				Scheme:      k8sClient.Scheme(),
				MySqlClient: fakeClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			cred := &v1alpha1.MySqlCredentials{}
			err = k8sClient.Get(ctx, typeNamespacedName, cred)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(cred.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
