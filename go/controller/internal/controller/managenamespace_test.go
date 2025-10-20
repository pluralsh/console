package controller_test

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("ManagedNamespace Service Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			managedNamespaceName = "ns-test"
			clusterName          = "cluster-test"
			namespace            = "default"
			id                   = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      managedNamespaceName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: clusterName, Namespace: namespace},
				Spec: v1alpha1.ClusterSpec{
					Cloud: "aws",
				},
			}, func(p *v1alpha1.Cluster) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
			By("creating the custom resource for the Kind ManagedNamespace")
			ns := &v1alpha1.ManagedNamespace{}
			err := k8sClient.Get(ctx, typeNamespacedName, ns)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ManagedNamespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:      managedNamespaceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.ManagedNamespaceSpec{
						Name:        lo.ToPtr(managedNamespaceName),
						Description: lo.ToPtr("test"),
						Labels:      map[string]string{"a": "a"},
						Annotations: map[string]string{"b": "b"},
						Target: &v1alpha1.ClusterTarget{
							Distro: lo.ToPtr(gqlclient.ClusterDistroGeneric),
							//ClusterRefs: []corev1.ObjectReference{
							//	{
							//		Namespace: clusterName,
							//		Name:      namespace,
							//	},
							//},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: clusterName, Namespace: namespace}, resource)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Cluster")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
			ns := &v1alpha1.ManagedNamespace{}
			if err := k8sClient.Get(ctx, typeNamespacedName, ns); err == nil {
				By("Cleanup the specific resource instance ManagedNamespace")
				Expect(k8sClient.Delete(ctx, ns)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				returnCreateNamespace *gqlclient.ManagedNamespaceFragment
				expectedStatus        v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("5X23O5JAH5SOHTKEQIEEJDQV4ZGYBN7QSOG3RAU3TOM57XYOEALQ===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
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
				returnCreateNamespace: &gqlclient.ManagedNamespaceFragment{
					ID: "123",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateNamespace", mock.Anything, mock.Anything).Return(test.returnCreateNamespace, nil)
			namespaceReconciler := &controller.ManagedNamespaceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := namespaceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			mns := &v1alpha1.ManagedNamespace{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should Wait for project", func() {
			By("Project doesn't exist, should Wait for project to be created")
			test := struct {
				returnCreateNamespace *gqlclient.ManagedNamespaceFragment
				expectedStatus        v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("5X23O5JAH5SOHTKEQIEEJDQV4ZGYBN7QSOG3RAU3TOM57XYOEALQ===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonError.String(),
							Message: "projects.deployments.plural.sh \"some-project\" not found",
						},
					},
				},
				returnCreateNamespace: &gqlclient.ManagedNamespaceFragment{
					ID: "123",
				},
			}
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.ManagedNamespace{
				ObjectMeta: metav1.ObjectMeta{Name: managedNamespaceName, Namespace: namespace},
			}, func(p *v1alpha1.ManagedNamespace) {
				p.Spec.ProjectRef = &corev1.ObjectReference{
					Namespace: namespace,
					Name:      "some-project",
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetNamespaceByName", mock.Anything, mock.Anything).Return(test.returnCreateNamespace, nil)
			namespaceReconciler := &controller.ManagedNamespaceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := namespaceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())

			mns := &v1alpha1.ManagedNamespace{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			test := struct {
				returnGetNs *gqlclient.ManagedNamespaceFragment
			}{
				returnGetNs: &gqlclient.ManagedNamespaceFragment{
					ID: "123",
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.ManagedNamespace{
				ObjectMeta: metav1.ObjectMeta{Name: managedNamespaceName, Namespace: namespace},
			}, func(p *v1alpha1.ManagedNamespace) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.ManagedNamespace{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetNamespace", mock.Anything, mock.Anything).Return(test.returnGetNs, nil)
			fakeConsoleClient.On("DeleteNamespace", mock.Anything, mock.Anything).Return(nil)
			nsReconciler := &controller.ManagedNamespaceReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.ManagedNamespace{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err.Error()).To(Equal("managednamespaces.deployments.plural.sh \"ns-test\" not found"))
		})

	})

})
