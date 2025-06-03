package controller_test

import (
	"bytes"
	"context"
	"io"
	"net/http"

	"github.com/elastic/go-elasticsearch/v9/esapi"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("ElasticsearchUser Controller", func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName   = "test-resource"
			namespace      = "default"
			userSecretName = "test-user-secret"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}
		elasticsearchuser := &v1alpha1.ElasticsearchUser{}
		elasticsearCredential := &v1alpha1.ElasticsearchCredentials{}
		secret := &corev1.Secret{}

		BeforeEach(func() {
			err := k8sClient.Get(ctx, types.NamespacedName{Namespace: namespace, Name: userSecretName}, secret)
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name:      userSecretName,
						Namespace: namespace,
					},
					Data: map[string][]byte{
						"password": []byte("mock"),
					},
				}, nil)).To(Succeed())
			}
			By("creating the custom resource for the Kind ElasticsearchCredentials")
			err = k8sClient.Get(ctx, typeNamespacedName, elasticsearCredential)
			if err != nil && errors.IsNotFound(err) {
				credentials := &v1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.ElasticsearchCredentialsSpec{
						Insecure: nil,
						URL:      "http://example.com",
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
				Expect(common.MaybePatch(k8sClient, &v1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{Name: resourceName, Namespace: "default"},
				}, func(p *v1alpha1.ElasticsearchCredentials) {
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

			By("creating the custom resource for the Kind ElasticsearchUser")
			err = k8sClient.Get(ctx, typeNamespacedName, elasticsearchuser)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ElasticsearchUser{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: v1alpha1.ElasticsearchUserSpec{
						CredentialsRef: v1.LocalObjectReference{
							Name: resourceName}, // Not required for this test.
						Definition: v1alpha1.ElasticsearchUserDefinition{
							User: "test",
							PasswordSecretKeyRef: v1.SecretKeySelector{
								LocalObjectReference: v1.LocalObjectReference{
									Name: userSecretName,
								},
								Key: "password",
							},
							Role: v1alpha1.ElasticsearchRole{
								Name: "test",
							},
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &v1alpha1.ElasticsearchUser{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance ElasticsearchUser")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			secret := &corev1.Secret{}
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

			fakeConsoleClient := mocks.NewElasticsearchClientMock(mocks.TestingT)
			fakeConsoleClient.On("Init", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			fakeConsoleClient.On("CreateRole", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)
			fakeConsoleClient.On("CreateUser", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticSearchUserReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			index := &v1alpha1.ElasticsearchUser{}
			err = k8sClient.Get(ctx, typeNamespacedName, index)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(index.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
