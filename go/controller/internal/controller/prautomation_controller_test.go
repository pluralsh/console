package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func generatePRAutomation(name string, spec v1alpha1.PrAutomationSpec) *v1alpha1.PrAutomation {
	return &v1alpha1.PrAutomation{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		Spec: spec,
	}
}

var _ = Describe("PR Automation Controller", func() {
	const (
		prAutomationNamePrefix = "github-automation"
		prAutomationConsoleID  = "github-automation-console-id"

		scmConnectionNamePrefix = "github"
		scmConnectionConsoleID  = "github-console-id"

		clusterNamePrefix = "cluster"
		clusterNamespace  = "default"
		clusterConsoleID  = "cluster-console-id"
	)

	var (
		ctx = context.Background()
	)

	Describe("reconciling resource", func() {
		Context("with SCM Connection", func() {
			When("exists", func() {
				var (
					prAutomationName  = common.StringGenerator().WithPrefix(prAutomationNamePrefix, 5)
					scmConnectionName = common.StringGenerator().WithPrefix(scmConnectionNamePrefix, 5)

					generatedPrAutomation = generatePRAutomation(prAutomationName, v1alpha1.PrAutomationSpec{
						ScmConnectionRef: corev1.ObjectReference{
							Name: scmConnectionName,
						},
					})

					prAutomationObjectKey = types.NamespacedName{Name: prAutomationName}
				)

				BeforeEach(func() {
					By("Creating PR Automation")
					Expect(common.MaybeCreate(k8sClient, generatedPrAutomation, func(in *v1alpha1.PrAutomation) {
						in.Status.ID = lo.ToPtr(prAutomationConsoleID)
					})).To(Succeed())

					By("Creating SCM Connection")
					Expect(common.MaybeCreate(k8sClient, &v1alpha1.ScmConnection{
						ObjectMeta: metav1.ObjectMeta{
							Name: scmConnectionName,
						},
						Spec: v1alpha1.ScmConnectionSpec{
							Name:           scmConnectionName,
							Type:           gqlclient.ScmTypeGithub,
							TokenSecretRef: &corev1.SecretReference{},
						},
					}, func(in *v1alpha1.ScmConnection) {
						in.Status.ID = lo.ToPtr(scmConnectionConsoleID)
					})).To(Succeed())
				})

				It("should successfully reconcile", func() {
					fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
					fakeConsoleClient.On("GetPrAutomationByName", mock.Anything, prAutomationName).Return(nil, nil)
					fakeConsoleClient.On("CreatePrAutomation", mock.Anything, mock.Anything).Return(&gqlclient.PrAutomationFragment{
						ID:   prAutomationConsoleID,
						Name: prAutomationName,
					}, nil)

					controllerReconciler := &controller.PrAutomationReconciler{
						Client:        k8sClient,
						Scheme:        k8sClient.Scheme(),
						ConsoleClient: fakeConsoleClient,
					}

					_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: prAutomationObjectKey})
					Expect(err).NotTo(HaveOccurred())

					prAutomation := &v1alpha1.PrAutomation{}
					err = k8sClient.Get(ctx, prAutomationObjectKey, prAutomation)
					attrs, _, _ := controllerReconciler.Attributes(ctx, prAutomation)
					sha, _ := utils.HashObject(attrs)

					Expect(err).NotTo(HaveOccurred())
					Expect(common.SanitizeStatusConditions(prAutomation.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
						ID:  lo.ToPtr(prAutomationConsoleID),
						SHA: lo.ToPtr(sha),
						Conditions: []metav1.Condition{
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
			})

			When("does not exist", func() {
				var (
					prAutomationName  = common.StringGenerator().WithPrefix(prAutomationNamePrefix, 5)
					scmConnectionName = common.StringGenerator().WithPrefix(scmConnectionNamePrefix, 5)

					generatedPrAutomation = generatePRAutomation(prAutomationName, v1alpha1.PrAutomationSpec{
						ScmConnectionRef: corev1.ObjectReference{
							Name: scmConnectionName,
						},
					})

					prAutomationObjectKey = types.NamespacedName{Name: prAutomationName}
				)

				BeforeEach(func() {
					By("Creating PR Automation")
					Expect(common.MaybeCreate(k8sClient, generatedPrAutomation, func(in *v1alpha1.PrAutomation) {
						in.Status.ID = lo.ToPtr(prAutomationConsoleID)
					})).To(Succeed())
				})

				It("should error with scm connection not found", func() {
					fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
					fakeConsoleClient.On("GetPrAutomationByName", mock.Anything, prAutomationName).Return(nil, nil)
					fakeConsoleClient.On("CreatePrAutomation", mock.Anything, mock.Anything).Return(&gqlclient.PrAutomationFragment{
						ID:   prAutomationConsoleID,
						Name: prAutomationName,
					}, nil)

					controllerReconciler := &controller.PrAutomationReconciler{
						Client:        k8sClient,
						Scheme:        k8sClient.Scheme(),
						ConsoleClient: fakeConsoleClient,
					}

					_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: prAutomationObjectKey})
					Expect(err).NotTo(HaveOccurred())
				})
			})
		})

		Context("with Cluster", func() {
			When("exists", func() {
				var (
					prAutomationName  = common.StringGenerator().WithPrefix(prAutomationNamePrefix, 5)
					scmConnectionName = common.StringGenerator().WithPrefix(scmConnectionNamePrefix, 5)
					clusterName       = common.StringGenerator().WithPrefix(clusterNamePrefix, 5)

					generatedPrAutomation = generatePRAutomation(prAutomationName, v1alpha1.PrAutomationSpec{
						ScmConnectionRef: corev1.ObjectReference{
							Name: scmConnectionName,
						},
						ClusterRef: &corev1.ObjectReference{
							Name:      clusterName,
							Namespace: clusterNamespace,
						},
					})

					prAutomationObjectKey = types.NamespacedName{Name: prAutomationName}
				)

				BeforeEach(func() {
					By("Creating SCM Connection")
					Expect(common.MaybeCreate(k8sClient, &v1alpha1.ScmConnection{
						ObjectMeta: metav1.ObjectMeta{
							Name: scmConnectionName,
						},
						Spec: v1alpha1.ScmConnectionSpec{
							Name:           scmConnectionName,
							Type:           gqlclient.ScmTypeGithub,
							TokenSecretRef: &corev1.SecretReference{},
						},
					}, func(in *v1alpha1.ScmConnection) {
						in.Status.ID = lo.ToPtr(scmConnectionConsoleID)
					})).To(Succeed())

					By("Creating PR Automation")
					Expect(common.MaybeCreate(k8sClient, generatedPrAutomation, func(in *v1alpha1.PrAutomation) {
						in.Status.ID = lo.ToPtr(prAutomationConsoleID)
					})).To(Succeed())

					By("Creating Cluster")
					Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
						ObjectMeta: metav1.ObjectMeta{
							Name:      clusterName,
							Namespace: clusterNamespace,
						},
						Spec: v1alpha1.ClusterSpec{
							Cloud: "aws",
						},
					}, func(in *v1alpha1.Cluster) {
						in.Status.ID = lo.ToPtr(clusterConsoleID)
					})).To(Succeed())
				})

				It("should successfully reconcile", func() {
					fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
					fakeConsoleClient.On("GetPrAutomationByName", mock.Anything, prAutomationName).Return(nil, nil)
					fakeConsoleClient.On("CreatePrAutomation", mock.Anything, mock.Anything).Return(&gqlclient.PrAutomationFragment{
						ID:   prAutomationConsoleID,
						Name: prAutomationName,
					}, nil)

					controllerReconciler := &controller.PrAutomationReconciler{
						Client:        k8sClient,
						Scheme:        k8sClient.Scheme(),
						ConsoleClient: fakeConsoleClient,
					}

					_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: prAutomationObjectKey})
					Expect(err).NotTo(HaveOccurred())

					prAutomation := &v1alpha1.PrAutomation{}
					err = k8sClient.Get(ctx, prAutomationObjectKey, prAutomation)

					attrs, _, _ := controllerReconciler.Attributes(ctx, prAutomation)
					sha, _ := utils.HashObject(attrs)

					Expect(err).NotTo(HaveOccurred())
					Expect(common.SanitizeStatusConditions(prAutomation.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
						ID:  lo.ToPtr(prAutomationConsoleID),
						SHA: lo.ToPtr(sha),
						Conditions: []metav1.Condition{
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
			})

			When("does not exist", func() {
				var (
					prAutomationName  = common.StringGenerator().WithPrefix(prAutomationNamePrefix, 5)
					scmConnectionName = common.StringGenerator().WithPrefix(scmConnectionNamePrefix, 5)
					clusterName       = common.StringGenerator().WithPrefix(clusterNamePrefix, 5)

					generatedPrAutomation = generatePRAutomation(prAutomationName, v1alpha1.PrAutomationSpec{
						ScmConnectionRef: corev1.ObjectReference{
							Name: scmConnectionName,
						},
						ClusterRef: &corev1.ObjectReference{
							Name:      clusterName,
							Namespace: clusterNamespace,
						},
					})

					prAutomationObjectKey = types.NamespacedName{Name: prAutomationName}
				)

				BeforeEach(func() {
					By("Creating SCM Connection")
					Expect(common.MaybeCreate(k8sClient, &v1alpha1.ScmConnection{
						ObjectMeta: metav1.ObjectMeta{
							Name: scmConnectionName,
						},
						Spec: v1alpha1.ScmConnectionSpec{
							Name:           scmConnectionName,
							Type:           gqlclient.ScmTypeGithub,
							TokenSecretRef: &corev1.SecretReference{},
						},
					}, func(in *v1alpha1.ScmConnection) {
						in.Status.ID = lo.ToPtr(scmConnectionConsoleID)
					})).To(Succeed())

					By("Creating PR Automation")
					Expect(common.MaybeCreate(k8sClient, generatedPrAutomation, func(in *v1alpha1.PrAutomation) {
						in.Status.ID = lo.ToPtr(prAutomationConsoleID)
					})).To(Succeed())
				})

				It("should requeue when cluster not found", func() {
					fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
					fakeConsoleClient.On("GetPrAutomationByName", mock.Anything, prAutomationName).Return(nil, nil)
					fakeConsoleClient.On("CreatePrAutomation", mock.Anything, mock.Anything).Return(&gqlclient.PrAutomationFragment{
						ID:   prAutomationConsoleID,
						Name: prAutomationName,
					}, nil)

					controllerReconciler := &controller.PrAutomationReconciler{
						Client:        k8sClient,
						Scheme:        k8sClient.Scheme(),
						ConsoleClient: fakeConsoleClient,
					}

					_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: prAutomationObjectKey})
					Expect(err).NotTo(HaveOccurred())
				})
			})
		})
	})
})
