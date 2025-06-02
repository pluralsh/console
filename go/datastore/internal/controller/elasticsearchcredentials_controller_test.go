package controller_test

import (
	"bytes"
	"context"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"io"
	"net/http"

	"github.com/elastic/go-elasticsearch/v9/esapi"
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

var _ = Describe("ElasticsearchCredentials Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-resource"
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

			elasticsearCredential := &dbsv1alpha1.ElasticsearchCredentials{}
			By("creating the custom resource for the Kind ElasticsearchCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, elasticsearCredential)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: dbsv1alpha1.ElasticsearchCredentialsSpec{
						Insecure: nil,
						URL:      "http://example.com",
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
			resource := &dbsv1alpha1.ElasticsearchCredentials{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance ElasticsearchCredentials")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
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

			fakeConsoleClient := mocks.NewElasticsearchClientMock(mocks.TestingT)
			fakeConsoleClient.On("ClusterHealth").Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticSearchCredentialsReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			cred := &v1alpha1.ElasticsearchCredentials{}
			err = k8sClient.Get(ctx, typeNamespacedName, cred)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(cred.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
