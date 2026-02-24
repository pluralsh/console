package controller_test

import (
	"context"
	"encoding/json"

	"k8s.io/apimachinery/pkg/runtime"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

var _ = Describe("ServiceContext Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			name      = "test"
			namespace = "default"
			id        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ServiceContext")
			sc := &v1alpha1.ServiceContext{}
			err := k8sClient.Get(ctx, typeNamespacedName, sc)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ServiceContext{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.ServiceContextSpec{
						Configuration: runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			sc := &v1alpha1.ServiceContext{}
			if err := k8sClient.Get(ctx, typeNamespacedName, sc); err == nil {
				By("Cleanup the specific resource instance ServiceContext")
				Expect(k8sClient.Delete(ctx, sc)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				fragment       *gqlclient.ServiceContextFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("Z5PGHG2MVCGI7PUAFZC7PQ5KRNEPBBBJCZA7KBFHUQYAOXBMI4KA===="),
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
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				fragment: &gqlclient.ServiceContextFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			fakeConsoleClient.On("SaveServiceContext", mock.Anything, mock.Anything).Return(test.fragment, nil)

			nr := &controller.ServiceContextReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.ServiceContext{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile existing contexts", func() {
			By("Create existing resource")
			test := struct {
				fragment       *gqlclient.ServiceContextFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("Z5PGHG2MVCGI7PUAFZC7PQ5KRNEPBBBJCZA7KBFHUQYAOXBMI4KA===="),
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
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				fragment: &gqlclient.ServiceContextFragment{
					ID: id,
				},
			}
			sc := &v1alpha1.ServiceContext{}
			err := k8sClient.Get(ctx, typeNamespacedName, sc)
			Expect(err).NotTo(HaveOccurred())

			Expect(common.MaybePatch(k8sClient, sc, func(object *v1alpha1.ServiceContext) {
				object.Status = v1alpha1.Status{}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(test.fragment, nil).Once()
			fakeConsoleClient.On("SaveServiceContext", mock.Anything, mock.Anything).Return(test.fragment, nil).Once()

			nr := &controller.ServiceContextReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.ServiceContext{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully merge configMapRef and secretRef into configuration", func() {
			By("Create secret and configmap")
			secretName := "test-secret"
			configMapName := "test-configmap"
			secretNamespacedName := types.NamespacedName{Name: secretName, Namespace: namespace}
			configMapNamespacedName := types.NamespacedName{Name: configMapName, Namespace: namespace}

			// Create secret
			secret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"secretKey1": []byte("secretValue1"),
					"secretKey2": []byte("secretValue2"),
				},
			}
			Expect(k8sClient.Create(ctx, secret)).To(Succeed())
			defer func() {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}()

			// Create configmap
			configMap := &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      configMapName,
					Namespace: namespace,
				},
				Data: map[string]string{
					"configKey1": "configValue1",
					"configKey2": "configValue2",
				},
			}
			Expect(k8sClient.Create(ctx, configMap)).To(Succeed())
			defer func() {
				Expect(k8sClient.Delete(ctx, configMap)).To(Succeed())
			}()

			By("Create ServiceContext with configMapRef and secretRef")
			scName := "test-with-refs"
			scNamespacedName := types.NamespacedName{Name: scName, Namespace: namespace}
			sc := &v1alpha1.ServiceContext{
				ObjectMeta: metav1.ObjectMeta{
					Name:      scName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ServiceContextSpec{
					Configuration: runtime.RawExtension{Raw: []byte(`{"existingKey":"existingValue"}`)},
					ConfigMapRef: &corev1.ObjectReference{
						Name:      configMapName,
						Namespace: namespace,
					},
					SecretRef: &corev1.SecretReference{
						Name:      secretName,
						Namespace: namespace,
					},
				},
			}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())
			defer func() {
				Expect(k8sClient.Delete(ctx, sc)).To(Succeed())
			}()

			By("Reconcile the ServiceContext")
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())

			// Verify that SaveServiceContext is called with merged configuration
			fakeConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(func(attrs gqlclient.ServiceContextAttributes) bool {
				if attrs.Configuration == nil {
					return false
				}
				var config map[string]interface{}
				if err := json.Unmarshal([]byte(*attrs.Configuration), &config); err != nil {
					return false
				}
				// Check that all keys are present
				return config["existingKey"] == "existingValue" &&
					config["configKey1"] == "configValue1" &&
					config["configKey2"] == "configValue2" &&
					config["secretKey1"] == "secretValue1" &&
					config["secretKey2"] == "secretValue2"
			})).Return(&gqlclient.ServiceContextFragment{ID: "456"}, nil)

			nr := &controller.ServiceContextReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: scNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			By("Verify annotations were added to secret and configmap")
			updatedSecret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, secretNamespacedName, updatedSecret)).To(Succeed())
			Expect(updatedSecret.GetAnnotations()).NotTo(BeNil())
			Expect(updatedSecret.GetAnnotations()[utils.OwnerRefAnnotation]).To(ContainSubstring(namespace + "/" + scName))

			updatedConfigMap := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, configMapNamespacedName, updatedConfigMap)).To(Succeed())
			Expect(updatedConfigMap.GetAnnotations()).NotTo(BeNil())
			Expect(updatedConfigMap.GetAnnotations()[utils.OwnerRefAnnotation]).To(ContainSubstring(namespace + "/" + scName))
		})

	})

})
