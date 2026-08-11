package controller_test

import (
	"context"
	"encoding/json"
	"reflect"

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

		It("should merge multiple ConfigMap refs with scoped data and ordered flat overrides", func() {
			flatOne := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "multi-flat-one", Namespace: namespace}, Data: map[string]string{"shared": "first", "one": "1"}}
			scoped := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "multi-scoped", Namespace: namespace}, Data: map[string]string{"host": "db", "port": "5432"}}
			flatTwo := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "multi-flat-two", Namespace: namespace}, Data: map[string]string{"shared": "last", "two": "2"}}
			for _, cm := range []*corev1.ConfigMap{flatOne, scoped, flatTwo} {
				Expect(k8sClient.Create(ctx, cm)).To(Succeed())
			}

			scKey := types.NamespacedName{Name: "multi-configmaps", Namespace: namespace}
			sc := &v1alpha1.ServiceContext{
				ObjectMeta: metav1.ObjectMeta{Name: scKey.Name, Namespace: scKey.Namespace},
				Spec: v1alpha1.ServiceContextSpec{
					Configuration: runtime.RawExtension{Raw: []byte(`{"existing":"value"}`)},
					ConfigMapRefs: []v1alpha1.ConfigMapReference{
						{Name: flatOne.Name},
						{Name: scoped.Name, Scope: "database"},
						{Name: flatTwo.Name},
					},
				},
			}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			fakeConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{
				"existing": "value", "one": "1", "shared": "last", "two": "2",
				"database": map[string]interface{}{"host": "db", "port": "5432"},
			}))).Return(&gqlclient.ServiceContextFragment{ID: "multi"}, nil)

			nr := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: fakeConsoleClient}
			_, err := nr.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())
			for _, cm := range []*corev1.ConfigMap{flatOne, scoped, flatTwo} {
				updated := &corev1.ConfigMap{}
				Expect(k8sClient.Get(ctx, types.NamespacedName{Name: cm.Name, Namespace: cm.Namespace}, updated)).To(Succeed())
				Expect(updated.GetAnnotations()[utils.OwnerRefAnnotation]).To(ContainSubstring(namespace + "/" + scKey.Name))
			}
		})

		It("should annotate cross-namespace ConfigMaps and map updates to the ServiceContext", func() {
			otherNamespace := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "service-context-sources"}}
			Expect(k8sClient.Create(ctx, otherNamespace)).To(Succeed())
			sourceKey := types.NamespacedName{Name: "cross-namespace", Namespace: otherNamespace.Name}
			source := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: sourceKey.Name, Namespace: sourceKey.Namespace}, Data: map[string]string{"endpoint": "first"}}
			Expect(k8sClient.Create(ctx, source)).To(Succeed())

			scKey := types.NamespacedName{Name: "cross-namespace-source", Namespace: namespace}
			sc := &v1alpha1.ServiceContext{ObjectMeta: metav1.ObjectMeta{Name: scKey.Name, Namespace: scKey.Namespace}, Spec: v1alpha1.ServiceContextSpec{
				ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: sourceKey.Name, Namespace: sourceKey.Namespace}},
			}}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())

			firstConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			firstConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			firstConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{"endpoint": "first"}))).Return(&gqlclient.ServiceContextFragment{ID: "cross"}, nil)
			firstReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: firstConsoleClient}
			_, err := firstReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())

			updatedSource := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, sourceKey, updatedSource)).To(Succeed())
			Expect(updatedSource.GetAnnotations()[utils.OwnerRefAnnotation]).To(ContainSubstring(namespace + "/" + scKey.Name))
			Expect(utils.GetOwnerRefsAnnotationRequests(ctx, k8sClient, updatedSource, &v1alpha1.ServiceContext{})).To(ConsistOf(reconcile.Request{NamespacedName: scKey}))

			updatedSource.Data["endpoint"] = "second"
			Expect(k8sClient.Update(ctx, updatedSource)).To(Succeed())
			secondConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			secondConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			secondConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{"endpoint": "second"}))).Return(&gqlclient.ServiceContextFragment{ID: "cross"}, nil)
			secondReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: secondConsoleClient}
			_, err = secondReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())
		})

		It("should remove annotations from ConfigMaps that are no longer referenced", func() {
			staleSource := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "stale-configmap-source", Namespace: namespace}, Data: map[string]string{"value": "stale"}}
			currentSource := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "current-configmap-source", Namespace: namespace}, Data: map[string]string{"value": "current"}}
			Expect(k8sClient.Create(ctx, staleSource)).To(Succeed())
			Expect(k8sClient.Create(ctx, currentSource)).To(Succeed())

			scKey := types.NamespacedName{Name: "replace-configmap-source", Namespace: namespace}
			sc := &v1alpha1.ServiceContext{ObjectMeta: metav1.ObjectMeta{Name: scKey.Name, Namespace: scKey.Namespace}, Spec: v1alpha1.ServiceContextSpec{
				ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: staleSource.Name}},
			}}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())

			firstConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			firstConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			firstConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{"value": "stale"}))).Return(&gqlclient.ServiceContextFragment{ID: "replace"}, nil)
			firstReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: firstConsoleClient}
			_, err := firstReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())

			updatedSC := &v1alpha1.ServiceContext{}
			Expect(k8sClient.Get(ctx, scKey, updatedSC)).To(Succeed())
			updatedSC.Spec.ConfigMapRefs = []v1alpha1.ConfigMapReference{{Name: currentSource.Name}}
			Expect(k8sClient.Update(ctx, updatedSC)).To(Succeed())

			secondConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			secondConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			secondConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{"value": "current"}))).Return(&gqlclient.ServiceContextFragment{ID: "replace"}, nil)
			secondReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: secondConsoleClient}
			_, err = secondReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())

			updatedStaleSource := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: staleSource.Name, Namespace: staleSource.Namespace}, updatedStaleSource)).To(Succeed())
			Expect(updatedStaleSource.GetAnnotations()[utils.OwnerRefAnnotation]).NotTo(ContainSubstring(namespace + "/" + scKey.Name))
			Expect(utils.GetOwnerRefsAnnotationRequests(ctx, k8sClient, updatedStaleSource, &v1alpha1.ServiceContext{})).To(BeEmpty())

			updatedCurrentSource := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: currentSource.Name, Namespace: currentSource.Namespace}, updatedCurrentSource)).To(Succeed())
			Expect(utils.GetOwnerRefsAnnotationRequests(ctx, k8sClient, updatedCurrentSource, &v1alpha1.ServiceContext{})).To(ConsistOf(reconcile.Request{NamespacedName: scKey}))
		})

		DescribeTable("should reject invalid ConfigMap sources", func(name string, spec v1alpha1.ServiceContextSpec, expectedError string) {
			scKey := types.NamespacedName{Name: name, Namespace: namespace}
			sc := &v1alpha1.ServiceContext{ObjectMeta: metav1.ObjectMeta{Name: scKey.Name, Namespace: scKey.Namespace}, Spec: spec}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			nr := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: fakeConsoleClient}
			_, err := nr.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).To(MatchError(ContainSubstring(expectedError)))
		},
			Entry("when a source ConfigMap is missing", "missing-configmap", v1alpha1.ServiceContextSpec{ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: "does-not-exist"}}}, "failed to get configmap default/does-not-exist"),
			Entry("when legacy and list references are both set", "both-configmap-refs", v1alpha1.ServiceContextSpec{ConfigMapRef: &corev1.ObjectReference{Name: "legacy"}, ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: "new"}}}, "mutually exclusive"),
		)

		It("should resolve scope and flat-key collisions in declaration order", func() {
			scoped := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "colliding-scoped", Namespace: namespace}, Data: map[string]string{"value": "scoped"}}
			flat := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "colliding-flat", Namespace: namespace}, Data: map[string]string{"database": "flat"}}
			Expect(k8sClient.Create(ctx, scoped)).To(Succeed())
			Expect(k8sClient.Create(ctx, flat)).To(Succeed())

			scKey := types.NamespacedName{Name: "scope-flat-order", Namespace: namespace}
			sc := &v1alpha1.ServiceContext{ObjectMeta: metav1.ObjectMeta{Name: scKey.Name, Namespace: scKey.Namespace}, Spec: v1alpha1.ServiceContextSpec{
				ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: scoped.Name, Scope: "database"}, {Name: flat.Name}},
			}}
			Expect(k8sClient.Create(ctx, sc)).To(Succeed())

			firstConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			firstConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			firstConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{"database": "flat"}))).Return(&gqlclient.ServiceContextFragment{ID: "scope-flat"}, nil)
			firstReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: firstConsoleClient}
			_, err := firstReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scKey})
			Expect(err).NotTo(HaveOccurred())

			reverseKey := types.NamespacedName{Name: "flat-scope-order", Namespace: namespace}
			reverse := &v1alpha1.ServiceContext{ObjectMeta: metav1.ObjectMeta{Name: reverseKey.Name, Namespace: reverseKey.Namespace}, Spec: v1alpha1.ServiceContextSpec{
				ConfigMapRefs: []v1alpha1.ConfigMapReference{{Name: flat.Name}, {Name: scoped.Name, Scope: "database"}},
			}}
			Expect(k8sClient.Create(ctx, reverse)).To(Succeed())
			secondConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			secondConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, internalerror.NewNotFound())
			secondConsoleClient.On("SaveServiceContext", mock.Anything, mock.MatchedBy(configurationMatches(map[string]interface{}{
				"database": map[string]interface{}{"value": "scoped"},
			}))).Return(&gqlclient.ServiceContextFragment{ID: "flat-scope"}, nil)
			secondReconciler := &controller.ServiceContextReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: secondConsoleClient}
			_, err = secondReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: reverseKey})
			Expect(err).NotTo(HaveOccurred())
		})

	})

})

func configurationMatches(expected map[string]interface{}) func(gqlclient.ServiceContextAttributes) bool {
	return func(attrs gqlclient.ServiceContextAttributes) bool {
		if attrs.Configuration == nil {
			return false
		}

		actual := map[string]interface{}{}
		if err := json.Unmarshal([]byte(*attrs.Configuration), &actual); err != nil {
			return false
		}

		return reflect.DeepEqual(actual, expected)
	}
}
