package controller_test

import (
	"context"

	"github.com/pluralsh/console/go/controller/internal/cache"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("CloudConnection Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			connectionName              = "connection-name"
			connectionSecretName        = "connection-credentials"
			namespace                   = "default"
			connectionConsoleID         = "123"
			readonlyConnectionName      = "readonly-connection"
			readonlyConnectionConsoleID = "readonly-connection-console-id"
		)

		ctx := context.Background()
		namespacedName := types.NamespacedName{Name: connectionName, Namespace: namespace}
		readonlyNamespacedName := types.NamespacedName{Name: readonlyConnectionName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating connection secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      connectionSecretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"applicationCredentials": []byte("mock"),
				},
			}, nil)).To(Succeed())

			By("Creating connection")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.CloudConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      connectionName,
					Namespace: namespace,
				},
				Spec: v1alpha1.CloudConnectionSpec{
					Name:     lo.ToPtr(connectionName),
					Provider: v1alpha1.AWS,
					Configuration: v1alpha1.CloudConnectionConfiguration{
						AWS: &v1alpha1.AWSCloudConnection{
							AccessKeyId: "123",
							SecretAccessKey: v1alpha1.ObjectKeyReference{
								Name:      connectionSecretName,
								Namespace: namespace,
								Key:       "applicationCredentials",
							},
							Region:  lo.ToPtr("test"),
							Regions: []string{"test", "test2"},
						},
					},
				},
			}, func(p *v1alpha1.CloudConnection) {
				p.Status.ID = lo.ToPtr(connectionConsoleID)
			})).To(Succeed())

			By("Creating readonly connection")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.CloudConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      readonlyConnectionName,
					Namespace: namespace,
				},
				Spec: v1alpha1.CloudConnectionSpec{
					Provider: v1alpha1.AWS,
					Name:     lo.ToPtr(readonlyConnectionName),
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup connection")
			connection := &v1alpha1.CloudConnection{}
			err := k8sClient.Get(ctx, namespacedName, connection)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, connection)).To(Succeed())

			By("Cleanup readonly connection")
			readonlyProvider := &v1alpha1.CloudConnection{}
			err = k8sClient.Get(ctx, readonlyNamespacedName, readonlyProvider)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, readonlyProvider)).To(Succeed())

			By("Cleanup secret")
			secret := &corev1.Secret{}
			err = k8sClient.Get(ctx, types.NamespacedName{Name: connectionSecretName, Namespace: namespace}, secret)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
		})

		It("should successfully reconcile connection", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCloudConnection", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, connectionName))
			fakeConsoleClient.On("GetUser", mock.Anything).Return(&gqlclient.UserFragment{ID: "id"}, nil)
			fakeConsoleClient.On("IsCloudConnection", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("UpsertCloudConnection", mock.Anything, mock.Anything).Return(&gqlclient.CloudConnectionFragment{
				ID:   connectionConsoleID,
				Name: connectionName,
			}, nil)

			controllerReconciler := &controller.CloudConnectionReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				ConsoleClient:  fakeConsoleClient,
				UserGroupCache: cache.NewUserGroupCache(fakeConsoleClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			connection := &v1alpha1.CloudConnection{}
			err = k8sClient.Get(ctx, namespacedName, connection)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(connection.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(connectionConsoleID),
				SHA: lo.ToPtr("7K5Q3Y4AUAKHS7RBQNI2FZP7H7QZQCLCQJEG73Y2GBEQHWJDHVOQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile and update previously created connection", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.CloudConnection{
				ObjectMeta: metav1.ObjectMeta{Name: connectionName, Namespace: namespace},
			}, func(p *v1alpha1.CloudConnection) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCloudConnection", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, connectionName))
			fakeConsoleClient.On("GetUser", mock.Anything).Return(&gqlclient.UserFragment{ID: "id"}, nil)
			fakeConsoleClient.On("IsCloudConnection", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("UpsertCloudConnection", mock.Anything, mock.Anything).Return(&gqlclient.CloudConnectionFragment{
				ID:   connectionConsoleID,
				Name: connectionName,
			}, nil)

			controllerReconciler := &controller.CloudConnectionReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				ConsoleClient:  fakeConsoleClient,
				UserGroupCache: cache.NewUserGroupCache(fakeConsoleClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			connection := &v1alpha1.CloudConnection{}
			err = k8sClient.Get(ctx, namespacedName, connection)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(connection.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(connectionConsoleID),
				SHA: lo.ToPtr("7K5Q3Y4AUAKHS7RBQNI2FZP7H7QZQCLCQJEG73Y2GBEQHWJDHVOQ===="),
				Conditions: []metav1.Condition{
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
					{
						Type:   v1alpha1.ReadonlyConditionType.String(),
						Status: metav1.ConditionFalse,
						Reason: v1alpha1.ReadonlyConditionReason.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
				},
			})))
		})

		It("should successfully reconcile readonly connection", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCloudConnection", mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("GetCloudConnection", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.CloudConnectionFragment{
				ID:   readonlyConnectionConsoleID,
				Name: connectionName,
			}, nil).Once()

			controllerReconciler := &controller.CloudConnectionReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				ConsoleClient:  fakeConsoleClient,
				UserGroupCache: cache.NewUserGroupCache(fakeConsoleClient),
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: readonlyNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			connection := &v1alpha1.CloudConnection{}
			err = k8sClient.Get(ctx, readonlyNamespacedName, connection)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(connection.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID: lo.ToPtr(readonlyConnectionConsoleID),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadonlyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadonlyConditionReason.String(),
						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
					},
					{
						Type:   v1alpha1.SynchronizedConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.SynchronizedConditionReason.String(),
					},
					{
						Type:   v1alpha1.ReadyConditionType.String(),
						Status: metav1.ConditionTrue,
						Reason: v1alpha1.ReadyConditionType.String(),
					},
				},
			})))
		})
	})
})
