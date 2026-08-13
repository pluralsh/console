package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

var _ = Describe("SCM Connection Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			scmName         = "scm-connection-test"
			scmType         = gqlclient.ScmTypeGithub
			namespace       = "default"
			id              = "123"
			sha             = "6L2JPZZWD3FCA7SB7I2WXH2XTRJR5VID37X3RVIZ2NSKYKOSGLGQ===="
			secretName      = "test-secret"
			readonlyScmName = "readonly-scm-connection"
			readonlyScmID   = "readonly"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      scmName,
			Namespace: namespace,
		}

		readonlyTypeNamespacedName := types.NamespacedName{
			Namespace: namespace,
			Name:      readonlyScmName,
		}

		secretNamespacedName := types.NamespacedName{
			Name:      secretName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the secret")
			secret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				StringData: map[string]string{
					"token": "test-token",
				},
			}
			Expect(k8sClient.Create(ctx, secret)).To(Succeed())

			By("creating the custom resource for the Kind ScmConnection")
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource := &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      scmName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: scmName,
					Type: scmType,
					TokenSecretRef: &corev1.SecretReference{
						Name:      "test-secret",
						Namespace: namespace,
					},
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())

			By("creating readonly custom resource for the Kind ScmConnection")
			scm = &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, readonlyTypeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource = &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      readonlyScmName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: readonlyScmName,
					Type: scmType,
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterAll(func() {
			secret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, secretNamespacedName, secret)).To(Succeed())
			Expect(k8sClient.Delete(ctx, secret)).To(Succeed())

			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: scmName, Namespace: namespace}, scm); err == nil {
				By("Cleanup the specific resource instance ScmConnection")
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource on create", func() {
			By("Create resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr(sha),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
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
				returnGetScmConnection: &gqlclient.ScmConnectionFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, scmName)).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			fakeConsoleClient.On("CreateScmConnection", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource on update", func() {
			By("Update resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr(sha),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
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
				returnGetScmConnection: &gqlclient.ScmConnectionFragment{
					ID: id,
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{Name: scmName, Namespace: namespace},
			}, func(p *v1alpha1.ScmConnection) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("ABC")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil).Once()
			fakeConsoleClient.On("UpdateScmConnection", mock.Anything, mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			serviceReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			resource := &v1alpha1.ScmConnection{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil).Once()
			fakeConsoleClient.On("DeleteScmConnection", mock.Anything, mock.Anything).Return(nil).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			// Reconcile once to initiate ScmConnection deletion from the API
			_, err = scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			// Second reconcile sees that the object no longer exists in the API and removes the finalizer.
			_, err = scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)
			Expect(err).To(HaveOccurred())
		})

		It("should requeue reconcile when tokenSecretRef is nil", func() {
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				&gqlclient.ScmConnectionFragment{
					ID:   readonlyScmID,
					Name: readonlyScmName,
				},
				v1alpha1.Status{
					ID:  nil,
					SHA: nil,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonNotFound.String(),
							Message: v1alpha1.SynchronizedNotFoundConditionMessage.String(),
						},
					},
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, readonlyScmName))
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil)

			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: readonlyTypeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, readonlyTypeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile readonly resource", func() {
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				&gqlclient.ScmConnectionFragment{
					ID:   readonlyScmID,
					Name: readonlyScmName,
				},
				v1alpha1.Status{
					ID:  lo.ToPtr(readonlyScmID),
					SHA: nil,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
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
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil)

			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: readonlyTypeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, readonlyTypeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
	})
})

var _ = Describe("SCM Connection Secret reconciliation", Ordered, func() {
	const namespace = "default"

	ctx := context.Background()

	It("updates an external SCM connection after its token Secret rotates", func() {
		secretKey := types.NamespacedName{Name: "scm-secret-rotation", Namespace: namespace}
		scmKey := types.NamespacedName{Name: "scm-secret-rotation", Namespace: namespace}
		secret := &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: secretKey.Name, Namespace: secretKey.Namespace},
			StringData: map[string]string{"token": "v1"},
		}
		scm := &v1alpha1.ScmConnection{
			ObjectMeta: metav1.ObjectMeta{Name: scmKey.Name, Namespace: scmKey.Namespace},
			Spec: v1alpha1.ScmConnectionSpec{
				Name:           scmKey.Name,
				Type:           gqlclient.ScmTypeGithub,
				TokenSecretRef: &corev1.SecretReference{Name: secretKey.Name, Namespace: secretKey.Namespace},
			},
		}
		Expect(k8sClient.Create(ctx, secret)).To(Succeed())
		Expect(k8sClient.Create(ctx, scm)).To(Succeed())
		DeferCleanup(func() {
			for _, object := range []client.Object{&v1alpha1.ScmConnection{ObjectMeta: metav1.ObjectMeta{Name: scmKey.Name, Namespace: scmKey.Namespace}}, &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretKey.Name, Namespace: secretKey.Namespace}}} {
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, object))).To(Succeed())
			}
		})

		connection := &gqlclient.ScmConnectionFragment{ID: "external-scm", Name: scmKey.Name}
		firstClient := mocks.NewConsoleClientMock(mocks.TestingT)
		firstClient.On("GetScmConnectionByName", mock.Anything, scmKey.Name).Return(connection, nil).Once()
		firstClient.On("IsScmConnectionExists", mock.Anything, scmKey.Name).Return(true, nil).Once()
		firstClient.On("GetScmConnectionByName", mock.Anything, scmKey.Name).Return(connection, nil).Once()
		firstClient.On("UpdateScmConnection", mock.Anything, connection.ID, mock.MatchedBy(func(attr gqlclient.ScmConnectionAttributes) bool {
			return attr.Token != nil && *attr.Token == "v1"
		})).Return(connection, nil).Once()
		firstReconciler := &controller.ScmConnectionReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: firstClient}
		_, err := firstReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scmKey})
		Expect(err).NotTo(HaveOccurred())
		firstClient.AssertExpectations(GinkgoT())

		updatedScm := &v1alpha1.ScmConnection{}
		Expect(k8sClient.Get(ctx, scmKey, updatedScm)).To(Succeed())
		Expect(updatedScm.Status.AppliedTokenSecretRef).NotTo(BeNil())
		Expect(updatedScm.Status.AppliedTokenSecretRef.Name).To(Equal(secretKey.Name))
		Expect(updatedScm.Status.AppliedTokenSecretRef.Namespace).To(Equal(secretKey.Namespace))
		Expect(updatedScm.Status.AppliedTokenSecretRef.ResourceVersion).NotTo(BeEmpty())

		updatedSecret := &corev1.Secret{}
		Expect(k8sClient.Get(ctx, secretKey, updatedSecret)).To(Succeed())
		updatedSecret.StringData = map[string]string{"token": "v2"}
		Expect(k8sClient.Update(ctx, updatedSecret)).To(Succeed())

		secondClient := mocks.NewConsoleClientMock(mocks.TestingT)
		secondClient.On("IsScmConnectionExists", mock.Anything, scmKey.Name).Return(true, nil).Once()
		secondClient.On("GetScmConnectionByName", mock.Anything, scmKey.Name).Return(connection, nil).Once()
		secondClient.On("UpdateScmConnection", mock.Anything, connection.ID, mock.MatchedBy(func(attr gqlclient.ScmConnectionAttributes) bool {
			return attr.Token != nil && *attr.Token == "v2"
		})).Return(connection, nil).Once()
		secondReconciler := &controller.ScmConnectionReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: secondClient}
		_, err = secondReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scmKey})
		Expect(err).NotTo(HaveOccurred())
		secondClient.AssertExpectations(GinkgoT())
	})

	It("maps a shared Secret annotation to every SCM connection", func() {
		secretKey := types.NamespacedName{Name: "scm-shared-secret", Namespace: namespace}
		firstKey := types.NamespacedName{Name: "scm-shared-first"}
		secondKey := types.NamespacedName{Name: "scm-shared-second"}
		secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretKey.Name, Namespace: secretKey.Namespace}}
		first := &v1alpha1.ScmConnection{ObjectMeta: metav1.ObjectMeta{Name: firstKey.Name}, Spec: v1alpha1.ScmConnectionSpec{Name: firstKey.Name, Type: gqlclient.ScmTypeGithub}}
		second := &v1alpha1.ScmConnection{ObjectMeta: metav1.ObjectMeta{Name: secondKey.Name}, Spec: v1alpha1.ScmConnectionSpec{Name: secondKey.Name, Type: gqlclient.ScmTypeGithub}}
		Expect(k8sClient.Create(ctx, secret)).To(Succeed())
		Expect(k8sClient.Create(ctx, first)).To(Succeed())
		Expect(k8sClient.Create(ctx, second)).To(Succeed())
		DeferCleanup(func() {
			for _, object := range []client.Object{first, second, secret} {
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, object))).To(Succeed())
			}
		})

		Expect(utils.AddOwnerRefAnnotation(ctx, k8sClient, first, secret)).To(Succeed())
		Expect(utils.AddOwnerRefAnnotation(ctx, k8sClient, second, secret)).To(Succeed())
		updatedSecret := &corev1.Secret{}
		Expect(k8sClient.Get(ctx, secretKey, updatedSecret)).To(Succeed())
		Expect(utils.GetOwnerRefsAnnotationRequests(ctx, k8sClient, updatedSecret, new(v1alpha1.ScmConnection))).To(ConsistOf(
			reconcile.Request{NamespacedName: firstKey},
			reconcile.Request{NamespacedName: secondKey},
		))
	})

	It("does not add an SCMConnection owner reference to a referenced Secret", func() {
		secretKey := types.NamespacedName{Name: "scm-no-owner-reference", Namespace: namespace}
		scmKey := types.NamespacedName{Name: "scm-no-owner-reference", Namespace: namespace}
		secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretKey.Name, Namespace: secretKey.Namespace}, StringData: map[string]string{"token": "token"}}
		scm := &v1alpha1.ScmConnection{
			ObjectMeta: metav1.ObjectMeta{Name: scmKey.Name, Namespace: scmKey.Namespace},
			Spec:       v1alpha1.ScmConnectionSpec{Name: scmKey.Name, Type: gqlclient.ScmTypeGithub, TokenSecretRef: &corev1.SecretReference{Name: secretKey.Name, Namespace: secretKey.Namespace}},
		}
		Expect(k8sClient.Create(ctx, secret)).To(Succeed())
		Expect(k8sClient.Create(ctx, scm)).To(Succeed())
		DeferCleanup(func() {
			for _, object := range []client.Object{&v1alpha1.ScmConnection{ObjectMeta: metav1.ObjectMeta{Name: scmKey.Name, Namespace: scmKey.Namespace}}, &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: secretKey.Name, Namespace: secretKey.Namespace}}} {
				Expect(client.IgnoreNotFound(k8sClient.Delete(ctx, object))).To(Succeed())
			}
		})

		consoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		consoleClient.On("GetScmConnectionByName", mock.Anything, scmKey.Name).Return(nil, errors.NewNotFound(schema.GroupResource{}, scmKey.Name)).Once()
		consoleClient.On("IsScmConnectionExists", mock.Anything, scmKey.Name).Return(false, nil).Once()
		consoleClient.On("CreateScmConnection", mock.Anything, mock.Anything).Return(&gqlclient.ScmConnectionFragment{ID: "managed-scm"}, nil).Once()
		reconciler := &controller.ScmConnectionReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ConsoleClient: consoleClient}
		_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: scmKey})
		Expect(err).NotTo(HaveOccurred())
		consoleClient.AssertExpectations(GinkgoT())

		updatedSecret := &corev1.Secret{}
		Expect(k8sClient.Get(ctx, secretKey, updatedSecret)).To(Succeed())
		for _, ownerReference := range updatedSecret.OwnerReferences {
			Expect(ownerReference.Kind).NotTo(Equal("ScmConnection"))
		}
		Expect(updatedSecret.OwnerReferences).To(BeEmpty())
	})
})

var _ = Describe("GitRepository owner reference cleanup", Ordered, func() {
	Context("when reconciling a resource with GitRepository owner refs", func() {
		const (
			scmName    = "scm-with-owner-refs"
			scmType    = gqlclient.ScmTypeGithub
			namespace  = "default"
			id         = "456"
			sha        = "OFJASGL6S4CGH6LQPLJ4XZZPM6MEAGV3ZZ5UE6GYKYLREJEEAHZA===="
			secretName = "test-secret-owner-refs"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      scmName,
			Namespace: namespace,
		}

		secretNamespacedName := types.NamespacedName{
			Name:      secretName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the secret")
			secret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				StringData: map[string]string{
					"token": "test-token",
				},
			}
			Expect(k8sClient.Create(ctx, secret)).To(Succeed())

			By("creating the custom resource for the Kind ScmConnection with GitRepository owner refs")
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource := &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      scmName,
					Namespace: namespace,
					OwnerReferences: []metav1.OwnerReference{
						{
							APIVersion: "deployments.plural.sh/v1alpha1",
							Kind:       "GitRepository",
							Name:       "test-repo-1",
							UID:        "11111111-1111-1111-1111-111111111111",
						},
						{
							APIVersion: "deployments.plural.sh/v1alpha1",
							Kind:       "GitRepository",
							Name:       "test-repo-2",
							UID:        "22222222-2222-2222-2222-222222222222",
						},
						{
							APIVersion: "apps/v1",
							Kind:       "Deployment",
							Name:       "some-deployment",
							UID:        "33333333-3333-3333-3333-333333333333",
						},
					},
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: scmName,
					Type: scmType,
					TokenSecretRef: &corev1.SecretReference{
						Name:      secretName,
						Namespace: namespace,
					},
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterAll(func() {
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, secretNamespacedName, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}

			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				By("Cleanup the specific resource instance ScmConnection")
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
		})

		It("should remove GitRepository owner references but keep other owner refs", func() {
			By("Reconciling the resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr(sha),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
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
				returnGetScmConnection: &gqlclient.ScmConnectionFragment{
					ID: id,
				},
			}

			// Verify the SCMConnection has owner references before reconciliation
			scmBefore := &v1alpha1.ScmConnection{}
			err := k8sClient.Get(ctx, typeNamespacedName, scmBefore)
			Expect(err).NotTo(HaveOccurred())
			Expect(scmBefore.GetOwnerReferences()).To(HaveLen(3))

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, scmName)).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			fakeConsoleClient.On("CreateScmConnection", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

			// Verify that GitRepository owner references were removed
			ownerRefs := scm.GetOwnerReferences()
			Expect(ownerRefs).To(HaveLen(1), "Should only have 1 owner reference left (the Deployment)")

			// Verify that non-GitRepository owner reference is still present
			Expect(ownerRefs[0].Kind).To(Equal("Deployment"))
			Expect(ownerRefs[0].Name).To(Equal("some-deployment"))
			Expect(ownerRefs[0].APIVersion).To(Equal("apps/v1"))

			// Verify that GitRepository owner references were actually removed
			for _, ref := range ownerRefs {
				Expect(ref.Kind).NotTo(Equal("GitRepository"))
			}
		})
	})
})

var _ = Describe("waiting for Secret", Ordered, func() {
	Context("when reconciling a resource", func() {
		const (
			scmName   = "scm-connection-wait"
			scmType   = gqlclient.ScmTypeGithub
			namespace = "default"
			id        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      scmName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ScmConnection")
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource := &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      scmName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: scmName,
					Type: scmType,
					TokenSecretRef: &corev1.SecretReference{
						Name:      "test-secret",
						Namespace: namespace,
					},
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterAll(func() {
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: scmName, Namespace: namespace}, scm); err == nil {
				By("Cleanup the specific resource instance ScmConnection")
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
		})

		It("should wait for secret on create", func() {
			By("Create resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: "",
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
							Message: "secrets \"test-secret\" not found",
						},
					},
				},
				returnGetScmConnection: &gqlclient.ScmConnectionFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, scmName)).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			resp, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
			Expect(resp.RequeueAfter).ToNot(BeZero())
			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

	})
})
