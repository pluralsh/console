package controller_test

import (
	"context"

	"github.com/pluralsh/console/controller/internal/controller"
	"github.com/pluralsh/console/controller/internal/credentials"
	common "github.com/pluralsh/console/controller/internal/test/common"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/test/mocks"
)

var _ = Describe("DeploymentSettings Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			deploymentSettingsName = "global"
			namespace              = "plrl-deploy-operator"
			id                     = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      deploymentSettingsName,
			Namespace: namespace,
		}

		ds := &v1alpha1.DeploymentSettings{}
		ns := &corev1.Namespace{}
		BeforeAll(func() {
			By("creating the custom resource for the Kind Namespace")
			err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, ns)
			if err != nil && errors.IsNotFound(err) {
				newNamespace := &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name: namespace,
					},
				}
				Expect(k8sClient.Create(ctx, newNamespace)).To(Succeed())
			}
			By("creating the custom resource for the Kind DeploymentSettings")
			err = k8sClient.Get(ctx, typeNamespacedName, ds)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.DeploymentSettings{
					ObjectMeta: metav1.ObjectMeta{
						Name:      deploymentSettingsName,
						Namespace: namespace,
					},
					Spec: v1alpha1.DeploymentSettingsSpec{
						AgentHelmValues: &runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.DeploymentSettings{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance DeploymentSettings")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile the update resource", func() {
			By("Reconciling the update resource")
			test := struct {
				returnResource *gqlclient.DeploymentSettingsFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("DCEAWIBB4LMCBZMS2RLT55CFYHVD2MEYN4B3AOFSKP7SO55HFKZA===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				returnResource: &gqlclient.DeploymentSettingsFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetDeploymentSettings", mock.Anything).Return(test.returnResource, nil)
			fakeConsoleClient.On("UpdateDeploymentSettings", mock.Anything, mock.Anything).Return(nil, nil)

			controllerReconciler := &controller.DeploymentSettingsReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.DeploymentSettings{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
	})

})
