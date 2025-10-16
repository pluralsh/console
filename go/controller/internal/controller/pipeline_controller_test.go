package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Pipeline Controller", Ordered, func() {
	Context("when reconciling resource", func() {
		const (
			cloud                  = "aws"
			namespace              = "default"
			providerName           = "pipeline-provider"
			providerConsoleID      = "pipeline-provider-console-id"
			devClusterName         = "pipeline-dev"
			devClusterConsoleID    = "pipeline-dev-console-id"
			prodClusterName        = "pipeline-prod"
			prodClusterConsoleID   = "pipeline-prod-console-id"
			repositoryName         = "pipeline-repository"
			repositoryUrl          = "pipeline-repository-url"
			repositoryConsoleID    = "pipeline-repository-console-id"
			devServiceName         = "pipeline-dev-service"
			devServiceConsoleID    = "dpipeline-ev-service-console-id"
			prodServiceName        = "pipeline-prod-service"
			prodServiceConsoleID   = "pipeline-prod-service-console-id"
			pipelineName           = "pipeline"
			invalidRefPipelineName = "pipeline-invalid-ref"
			pipelineConsoleID      = "pipeline-console-id"
			devStageName           = "dev"
			prodStageName          = "prod"
		)

		ctx := context.Background()
		devNamespacedName := types.NamespacedName{Name: devClusterName, Namespace: namespace}
		prodNamespacedName := types.NamespacedName{Name: prodClusterName, Namespace: namespace}
		repositoryNamespacedName := types.NamespacedName{Name: repositoryName, Namespace: namespace}
		devServiceNamespacedName := types.NamespacedName{Name: devServiceName, Namespace: namespace}
		prodServiceNamespacedName := types.NamespacedName{Name: prodServiceName, Namespace: namespace}
		pipelineNamespacedName := types.NamespacedName{Name: pipelineName, Namespace: namespace}
		invalidRefPipelineNamespacedName := types.NamespacedName{Name: invalidRefPipelineName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating dev cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      devClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:      lo.ToPtr(devClusterName),
					Version:     lo.ToPtr("1.24"),
					Cloud:       cloud,
					ProviderRef: &corev1.ObjectReference{Name: providerName},
				},
			}, func(p *v1alpha1.Cluster) {
				p.Status.ID = lo.ToPtr(devClusterConsoleID)
			})).To(Succeed())

			By("Creating prod cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      prodClusterName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					Handle:      lo.ToPtr(prodClusterName),
					Version:     lo.ToPtr("1.24"),
					Cloud:       cloud,
					ProviderRef: &corev1.ObjectReference{Name: providerName},
				},
			}, func(p *v1alpha1.Cluster) {
				p.Status.ID = lo.ToPtr(prodClusterConsoleID)
			})).To(Succeed())

			By("Creating repository")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.GitRepository{
				ObjectMeta: metav1.ObjectMeta{
					Name:      repositoryName,
					Namespace: namespace,
				},
				Spec: v1alpha1.GitRepositorySpec{
					Url: repositoryUrl,
				},
			}, func(p *v1alpha1.GitRepository) {
				p.Status.ID = lo.ToPtr(repositoryConsoleID)
			})).To(Succeed())

			By("Creating dev service deployment")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: devServiceName, Namespace: namespace},
				Spec: v1alpha1.ServiceSpec{
					Version:       lo.ToPtr("1.24"),
					ClusterRef:    corev1.ObjectReference{Name: devClusterName, Namespace: namespace},
					RepositoryRef: &corev1.ObjectReference{Name: repositoryName, Namespace: namespace},
				},
			}, func(p *v1alpha1.ServiceDeployment) {
				p.Status.ID = lo.ToPtr(devServiceConsoleID)
			})).To(Succeed())

			By("Creating prod service deployment")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: prodServiceName, Namespace: namespace},
				Spec: v1alpha1.ServiceSpec{
					Version:       lo.ToPtr("1.24"),
					ClusterRef:    corev1.ObjectReference{Name: prodClusterName, Namespace: namespace},
					RepositoryRef: &corev1.ObjectReference{Name: repositoryName, Namespace: namespace},
				},
			}, func(p *v1alpha1.ServiceDeployment) {
				p.Status.ID = lo.ToPtr(prodServiceConsoleID)
			})).To(Succeed())

			By("Creating pipeline")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Pipeline{
				ObjectMeta: metav1.ObjectMeta{Name: pipelineName, Namespace: namespace},
				Spec: v1alpha1.PipelineSpec{
					Stages: []v1alpha1.PipelineStage{
						{
							Name: devStageName,
							Services: []v1alpha1.PipelineStageService{
								{ServiceRef: &corev1.ObjectReference{Name: devServiceName, Namespace: namespace}},
							},
						},
						{
							Name: prodStageName,
							Services: []v1alpha1.PipelineStageService{
								{
									ServiceRef: &corev1.ObjectReference{Name: prodServiceName, Namespace: namespace},
									Criteria: &v1alpha1.PipelineStageServicePromotionCriteria{
										ServiceRef: &corev1.ObjectReference{Name: devServiceName, Namespace: namespace},
										Secrets:    []*string{lo.ToPtr("test-service")},
									},
								},
							},
						},
					},
					Edges: []v1alpha1.PipelineEdge{
						{
							From:  lo.ToPtr(devStageName),
							To:    lo.ToPtr(prodStageName),
							Gates: []v1alpha1.PipelineGate{{Name: "approval", Type: gqlclient.GateTypeApproval}},
						},
					},
				},
			}, nil)).To(Succeed())

			By("creating pipeline")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Pipeline{
				ObjectMeta: metav1.ObjectMeta{Name: invalidRefPipelineName, Namespace: namespace},
				Spec: v1alpha1.PipelineSpec{
					Stages: []v1alpha1.PipelineStage{
						{
							Name: devStageName,
							Services: []v1alpha1.PipelineStageService{
								{ServiceRef: &corev1.ObjectReference{Name: "invalid-ref", Namespace: namespace}},
							},
						},
						{
							Name: prodStageName,
							Services: []v1alpha1.PipelineStageService{
								{
									ServiceRef: &corev1.ObjectReference{Name: prodServiceName, Namespace: namespace},
									Criteria: &v1alpha1.PipelineStageServicePromotionCriteria{
										ServiceRef: &corev1.ObjectReference{Name: devServiceName, Namespace: namespace},
										Secrets:    []*string{lo.ToPtr("test-service")},
									},
								},
							},
						},
					},
					Edges: []v1alpha1.PipelineEdge{
						{
							From:  lo.ToPtr(devStageName),
							To:    lo.ToPtr(prodStageName),
							Gates: []v1alpha1.PipelineGate{{Name: "approval", Type: gqlclient.GateTypeApproval}},
						},
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			By("Cleanup prod service deployment")
			prodService := &v1alpha1.ServiceDeployment{}
			err := k8sClient.Get(ctx, prodServiceNamespacedName, prodService)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, prodService)).To(Succeed())

			By("Cleanup dev service deployment")
			devService := &v1alpha1.ServiceDeployment{}
			err = k8sClient.Get(ctx, devServiceNamespacedName, devService)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, devService)).To(Succeed())

			By("Cleanup repository")
			repository := &v1alpha1.GitRepository{}
			err = k8sClient.Get(ctx, repositoryNamespacedName, repository)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, repository)).To(Succeed())

			By("Cleanup prod cluster")
			prodCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, prodNamespacedName, prodCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, prodCluster)).To(Succeed())

			By("Cleanup dev cluster")
			devCluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, devNamespacedName, devCluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, devCluster)).To(Succeed())
		})

		It("should successfully reconcile pipeline", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPipelineExisting", mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("SavePipeline", mock.AnythingOfType("string"), mock.Anything).Return(&gqlclient.PipelineFragmentMinimal{ID: pipelineConsoleID}, nil)

			controllerReconciler := &controller.PipelineReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Process(ctx, reconcile.Request{NamespacedName: pipelineNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			pipeline := &v1alpha1.Pipeline{}
			err = k8sClient.Get(ctx, pipelineNamespacedName, pipeline)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(pipeline.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(pipelineConsoleID),
				SHA: lo.ToPtr("LCRWA6OVJKINWVJ6YI3BWBBK3YXM2GWKMYOTTJRCAPJBIZ7Q2VGA===="),
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
			})))
		})

		It("should successfully reconcile and update previously created pipeline", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Pipeline{
				ObjectMeta: metav1.ObjectMeta{Name: pipelineName, Namespace: namespace},
			}, func(p *v1alpha1.Pipeline) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPipelineExisting", mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("SavePipeline", mock.AnythingOfType("string"), mock.Anything).Return(&gqlclient.PipelineFragmentMinimal{ID: pipelineConsoleID}, nil)

			controllerReconciler := &controller.PipelineReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := controllerReconciler.Process(ctx, reconcile.Request{NamespacedName: pipelineNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			pipeline := &v1alpha1.Pipeline{}
			err = k8sClient.Get(ctx, pipelineNamespacedName, pipeline)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(pipeline.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
				ID:  lo.ToPtr(pipelineConsoleID),
				SHA: lo.ToPtr("LCRWA6OVJKINWVJ6YI3BWBBK3YXM2GWKMYOTTJRCAPJBIZ7Q2VGA===="),
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
			})))
		})

		It("should detect invalid service ref and set conditions accordingly", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPipelineExisting", mock.AnythingOfType("string")).Return(false, nil)
			fakeConsoleClient.On("SavePipeline", mock.AnythingOfType("string"), mock.Anything).Return(&gqlclient.PipelineFragmentMinimal{ID: pipelineConsoleID}, nil)

			controllerReconciler := &controller.PipelineReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			result, err := controllerReconciler.Process(ctx, reconcile.Request{NamespacedName: invalidRefPipelineNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
			Expect(err).NotTo(HaveOccurred())

			pipeline := &v1alpha1.Pipeline{}
			err = k8sClient.Get(ctx, invalidRefPipelineNamespacedName, pipeline)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(pipeline.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
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
						Message: "servicedeployments.deployments.plural.sh \"invalid-ref\" not found",
					},
				},
			})))
		})
	})
})
