package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	dbsv1alpha1 "github.com/pluralsh/console/go/datastore/api/v1alpha1"
)

var _ = Describe("Postgres Database Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-postgres-database"
		const namespace = "default"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}
		database := &dbsv1alpha1.PostgresDatabase{}
		credential := &dbsv1alpha1.PostgresCredentials{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind PostgresCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, credential)
			if err != nil && errors.IsNotFound(err) {
				credentials := &dbsv1alpha1.PostgresCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: dbsv1alpha1.PostgresCredentialsSpec{
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
				Expect(common.MaybePatch(k8sClient, &dbsv1alpha1.PostgresCredentials{
					ObjectMeta: metav1.ObjectMeta{Name: resourceName, Namespace: namespace},
				}, func(p *dbsv1alpha1.PostgresCredentials) {
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

			By("creating the custom resource for the Kind PostgresDatabase")
			err = k8sClient.Get(ctx, typeNamespacedName, database)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.PostgresDatabase{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: dbsv1alpha1.PostgresDatabaseSpec{
						CredentialsRef: v1.LocalObjectReference{
							Name: resourceName}, // Not required for this test.
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &dbsv1alpha1.PostgresDatabase{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance PostgresDatabase")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			cred := &dbsv1alpha1.PostgresCredentials{}
			err = k8sClient.Get(ctx, typeNamespacedName, cred)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance PostgresCredentials")
			Expect(k8sClient.Delete(ctx, cred)).To(Succeed())

		})
		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")

			expectedStatus := dbsv1alpha1.Status{
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
			fakePostgresClient.On("UpsertDatabase", mock.Anything).Return(nil)

			controllerReconciler := &controller.PostgresDatabaseReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				PostgresClient: fakePostgresClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			db := &dbsv1alpha1.PostgresDatabase{}
			err = k8sClient.Get(ctx, typeNamespacedName, db)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(db.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
