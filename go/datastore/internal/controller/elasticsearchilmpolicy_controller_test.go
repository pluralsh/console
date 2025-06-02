package controller_test

import (
	"bytes"
	"context"
	"io"
	"net/http"

	"github.com/elastic/go-elasticsearch/v9/esapi"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	"github.com/pluralsh/console/go/datastore/internal/test/mocks"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	dbsv1alpha1 "github.com/pluralsh/console/go/datastore/api/v1alpha1"
)

var _ = Describe("ElasticsearchILMPolicy Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-resource"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}
		elasticsearchilmpolicy := &dbsv1alpha1.ElasticsearchILMPolicy{}
		elasticsearCredential := &dbsv1alpha1.ElasticsearchCredentials{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind ElasticsearchCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, elasticsearCredential)
			if err != nil && errors.IsNotFound(err) {
				credentials := &dbsv1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: dbsv1alpha1.ElasticsearchCredentialsSpec{
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
				Expect(common.MaybePatch(k8sClient, &dbsv1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{Name: resourceName, Namespace: "default"},
				}, func(p *dbsv1alpha1.ElasticsearchCredentials) {
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

			By("creating the custom resource for the Kind ElasticsearchILMPolicy")
			err = k8sClient.Get(ctx, typeNamespacedName, elasticsearchilmpolicy)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.ElasticsearchILMPolicy{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: "default",
					},
					Spec: dbsv1alpha1.ElasticsearchILMPolicySpec{
						CredentialsRef: v1.LocalObjectReference{
							Name: resourceName}, // Not required for this test.
						Definition: runtime.RawExtension{
							Raw: []byte(`{
		"policy": {
			"phases": {
				"warm": {
					"min_age": "10d",
					"actions": {
						"forcemerge": {
							"max_num_segments": 1
						}
					}
				},
				"delete": {
					"min_age": "30d",
					"actions": {
						"delete": {}
					}
				}
			}
		}
	}`),
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterEach(func() {
			resource := &dbsv1alpha1.ElasticsearchILMPolicy{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance ElasticsearchILMPolicy")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
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

			fakeConsoleClient := mocks.NewElasticsearchClientMock(mocks.TestingT)
			fakeConsoleClient.On("Init", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			fakeConsoleClient.On("PutILMPolicy", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticsearchILMPolicyReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			policy := &dbsv1alpha1.ElasticsearchILMPolicy{}
			err = k8sClient.Get(ctx, typeNamespacedName, policy)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(policy.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
	})
})
