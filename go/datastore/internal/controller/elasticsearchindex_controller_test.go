package controller_test

import (
	"bytes"
	"context"
	"encoding/json"
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

var _ = Describe("ElasticsearchIndex Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-resource"
		const namespace = "default"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}
		elasticsearchIndex := &dbsv1alpha1.ElasticsearchIndex{}
		elasticsearchCredential := &dbsv1alpha1.ElasticsearchCredentials{}

		BeforeEach(func() {
			By("creating the custom resource for the Kind ElasticsearchCredentials")
			err := k8sClient.Get(ctx, typeNamespacedName, elasticsearchCredential)
			if err != nil && errors.IsNotFound(err) {
				credentials := &dbsv1alpha1.ElasticsearchCredentials{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
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
					ObjectMeta: metav1.ObjectMeta{Name: resourceName, Namespace: namespace},
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

			By("creating the custom resource for the Kind ElasticsearchIndex")
			err = k8sClient.Get(ctx, typeNamespacedName, elasticsearchIndex)
			if err != nil && errors.IsNotFound(err) {
				resource := &dbsv1alpha1.ElasticsearchIndex{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: dbsv1alpha1.ElasticsearchIndexSpec{
						CredentialsRef: v1.LocalObjectReference{
							Name: resourceName,
						},
						Definition: runtime.RawExtension{
							Raw: []byte(`{
	"settings": {
		"number_of_shards": 1
	},
	"mappings": {
		"properties": {
			"message": {
				"type": "text"
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
			resource := &dbsv1alpha1.ElasticsearchIndex{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			if errors.IsNotFound(err) {
				return
			}
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance ElasticsearchIndex")
			resource.Finalizers = nil
			Expect(k8sClient.Update(ctx, resource)).To(Succeed())
			err = k8sClient.Delete(ctx, resource)
			if !errors.IsNotFound(err) {
				Expect(err).NotTo(HaveOccurred())
			}
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
			fakeConsoleClient.On("ExistsIndex", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusNotFound,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)
			fakeConsoleClient.On("CreateIndex", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticSearchIndexReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			index := &dbsv1alpha1.ElasticsearchIndex{}
			err = k8sClient.Get(ctx, typeNamespacedName, index)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(index.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})

		It("should skip creation when the index already exists", func() {
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
			fakeConsoleClient.On("ExistsIndex", mock.Anything, mock.Anything).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticSearchIndexReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertNotCalled(mocks.TestingT, "CreateIndex", mock.Anything, mock.Anything)

			index := &dbsv1alpha1.ElasticsearchIndex{}
			err = k8sClient.Get(ctx, typeNamespacedName, index)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(index.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))
		})
		It("should demote is_write_index when the alias already has a write index", func() {
			By("creating an index CR that requests write on an existing alias")
			name := "bootstrap-index"
			nsName := types.NamespacedName{Name: name, Namespace: namespace}

			credName := resourceName
			resource := &dbsv1alpha1.ElasticsearchIndex{
				ObjectMeta: metav1.ObjectMeta{
					Name:      name,
					Namespace: namespace,
				},
				Spec: dbsv1alpha1.ElasticsearchIndexSpec{
					CredentialsRef: v1.LocalObjectReference{Name: credName},
					Name:           &[]string{"plrl-logs-000001"}[0],
					Definition: runtime.RawExtension{
						Raw: []byte(`{
	"aliases": {
		"plrl-logs-write": { "is_write_index": true }
	},
	"settings": { "number_of_shards": 1 }
}`),
					},
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			DeferCleanup(func() {
				obj := &dbsv1alpha1.ElasticsearchIndex{}
				if err := k8sClient.Get(ctx, nsName, obj); err == nil {
					obj.Finalizers = nil
					_ = k8sClient.Update(ctx, obj)
					_ = k8sClient.Delete(ctx, obj)
				}
			})

			fakeConsoleClient := mocks.NewElasticsearchClientMock(mocks.TestingT)
			fakeConsoleClient.On("Init", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			fakeConsoleClient.On("ExistsIndex", mock.Anything, "plrl-logs-000001").Return(&esapi.Response{
				StatusCode: http.StatusNotFound,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)
			fakeConsoleClient.On("GetAlias", mock.Anything, "plrl-logs-write").Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body: io.NopCloser(bytes.NewBufferString(`{
					"plrl-logs-000005": {
						"aliases": { "plrl-logs-write": { "is_write_index": true } }
					}
				}`)),
			}, nil)
			fakeConsoleClient.On("CreateIndex", "plrl-logs-000001", mock.MatchedBy(func(def runtime.RawExtension) bool {
				var body map[string]interface{}
				if err := json.Unmarshal(def.Raw, &body); err != nil {
					return false
				}
				aliases, _ := body["aliases"].(map[string]interface{})
				write, _ := aliases["plrl-logs-write"].(map[string]interface{})
				isWrite, _ := write["is_write_index"].(bool)
				return isWrite == false
			})).Return(&esapi.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer([]byte{})),
			}, nil)

			controllerReconciler := &controller.ElasticSearchIndexReconciler{
				Client:              k8sClient,
				Scheme:              k8sClient.Scheme(),
				ElasticsearchClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: nsName})
			Expect(err).NotTo(HaveOccurred())

			index := &dbsv1alpha1.ElasticsearchIndex{}
			Expect(k8sClient.Get(ctx, nsName, index)).To(Succeed())
			Expect(index.Status.Conditions).To(ContainElement(And(
				HaveField("Type", v1alpha1.ReadyConditionType.String()),
				HaveField("Status", metav1.ConditionTrue),
			)))
		})
	})
})
