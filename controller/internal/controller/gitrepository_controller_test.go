package controller

import (
	"context"

	"github.com/pluralsh/console/controller/internal/test/utils"

	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/test/mocks"
)

func sanitizeRepoConditions(status v1alpha1.GitRepositoryStatus) v1alpha1.GitRepositoryStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	return status
}

var _ = Describe("Repository Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			repoName  = "test-repo"
			repoUrl   = "https://test"
			namespace = "default"
			repoID    = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      repoName,
			Namespace: "default",
		}

		repository := &v1alpha1.GitRepository{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Repository")
			err := k8sClient.Get(ctx, typeNamespacedName, repository)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name:      repoName,
						Namespace: namespace,
					},
					Spec: v1alpha1.GitRepositorySpec{
						Url: repoUrl,
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.GitRepository{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Repository")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile the import resource", func() {
			By("Reconciling the import resource")
			test := struct {
				returnGetRepository         *gqlclient.GetGitRepository
				returnErrorGetRepository    error
				returnCreateRepository      *gqlclient.CreateGitRepository
				returnErrorCreateRepository error
				existingObjects             []ctrlruntimeclient.Object
				expectedStatus              v1alpha1.GitRepositoryStatus
			}{
				expectedStatus: v1alpha1.GitRepositoryStatus{
					ID: lo.ToPtr("123"),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
					},
				},
				returnGetRepository: &gqlclient.GetGitRepository{
					GitRepository: &gqlclient.GitRepositoryFragment{
						ID: repoID,
					},
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)

			controllerReconciler := &GitRepositoryReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			repository := &v1alpha1.GitRepository{}
			err = k8sClient.Get(ctx, typeNamespacedName, repository)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeRepoConditions(repository.Status)).To(Equal(sanitizeRepoConditions(test.expectedStatus)))
		})
	})

	Context("When reconciling a resource", func() {
		const (
			repoName   = "test-repo"
			repoUrl    = "https://test"
			secretName = "test-secret"
			namespace  = "default"
			repoID     = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      repoName,
			Namespace: "default",
		}

		repository := &v1alpha1.GitRepository{}
		secret := &corev1.Secret{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Repository")
			err := k8sClient.Get(ctx, typeNamespacedName, repository)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name:      repoName,
						Namespace: namespace,
					},
					Spec: v1alpha1.GitRepositorySpec{
						Url: repoUrl,
						CredentialsRef: &corev1.SecretReference{
							Name:      secretName,
							Namespace: namespace,
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}

			By("creating the custom resource for the Kind Secret")
			err = k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret)
			if err != nil && errors.IsNotFound(err) {
				resource := &corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: secretName, Namespace: namespace},
					Data:       map[string][]byte{"z": {1, 2, 3}, "a": {4, 5, 6}},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.GitRepository{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Repository")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			err = k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret)
			By("Cleanup the specific resource instance Secret")
			Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
		})

		It("should successfully reconcile the creation resource", func() {
			By("Reconciling the created resource")
			test := struct {
				returnGetRepository         *gqlclient.GetGitRepository
				returnErrorGetRepository    error
				returnCreateRepository      *gqlclient.CreateGitRepository
				returnErrorCreateRepository error
				existingObjects             []ctrlruntimeclient.Object
				expectedStatus              v1alpha1.GitRepositoryStatus
			}{
				expectedStatus: v1alpha1.GitRepositoryStatus{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("TEFHFGIB5PQMBLUWST2R6DXTY5QGH74WVGIKYQI7I3BY7BCSBDLA===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
					},
				},
				returnGetRepository: &gqlclient.GetGitRepository{
					GitRepository: nil,
				},
				returnCreateRepository: &gqlclient.CreateGitRepository{
					CreateGitRepository: &gqlclient.GitRepositoryFragment{
						ID: "123",
					},
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)
			fakeConsoleClient.On("CreateRepository", mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).Return(test.returnCreateRepository, test.returnErrorCreateRepository)

			controllerReconciler := &GitRepositoryReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			repository := &v1alpha1.GitRepository{}
			err = k8sClient.Get(ctx, typeNamespacedName, repository)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeRepoConditions(repository.Status)).To(Equal(sanitizeRepoConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the update resource", func() {
			By("Reconciling the updated resource")
			test := struct {
				returnGetRepository      *gqlclient.GetGitRepository
				returnErrorGetRepository error
				existingObjects          []ctrlruntimeclient.Object
				expectedStatus           v1alpha1.GitRepositoryStatus
			}{
				expectedStatus: v1alpha1.GitRepositoryStatus{
					ID:  lo.ToPtr(repoID),
					SHA: lo.ToPtr("TEFHFGIB5PQMBLUWST2R6DXTY5QGH74WVGIKYQI7I3BY7BCSBDLA===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
					},
				},
				returnGetRepository: &gqlclient.GetGitRepository{
					GitRepository: &gqlclient.GitRepositoryFragment{
						ID: repoID,
					},
				},
			}

			Expect(utils.MaybePatch(k8sClient, &v1alpha1.GitRepository{
				ObjectMeta: metav1.ObjectMeta{Name: repoName, Namespace: namespace},
			}, func(p *v1alpha1.GitRepository) {
				p.Status.ID = lo.ToPtr(repoID)
				p.Status.SHA = lo.ToPtr("ABC")
			})).To(Succeed())

			repository := &v1alpha1.GitRepository{}
			err := k8sClient.Get(ctx, typeNamespacedName, repository)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)
			fakeConsoleClient.On("UpdateRepository", mock.Anything, mock.Anything).Return(&gqlclient.UpdateGitRepository{}, nil)

			controllerReconciler := &GitRepositoryReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Get(ctx, typeNamespacedName, repository)
			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeRepoConditions(repository.Status)).To(Equal(sanitizeRepoConditions(test.expectedStatus)))
		})
	})
})
