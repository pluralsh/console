package common_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/common"
	testcommon "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

var _ = Describe("Get Project", Ordered, func() {
	Context("Get for different types", func() {
		const (
			projectID    = "123"
			projectName  = "project"
			resourceName = "test-resource"
			namespace    = "default"
		)
		ctx := context.Background()
		bootstrapToken := &v1alpha1.BootstrapToken{
			ObjectMeta: metav1.ObjectMeta{
				Name:      resourceName,
				Namespace: namespace,
			},
			Spec: v1alpha1.BootstrapTokenSpec{
				ProjectRef: corev1.ObjectReference{
					Name: projectName,
				},
			},
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Project")
			Expect(testcommon.MaybeCreate(k8sClient, &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{Name: projectName, Namespace: namespace},
				Spec:       v1alpha1.ProjectSpec{Name: projectName},
			}, func(p *v1alpha1.Project) {
				p.Status.ID = lo.ToPtr(projectID)
			})).To(Succeed())
		})

		AfterAll(func() {
			resource := &v1alpha1.Project{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: projectName, Namespace: namespace}, resource)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Project")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("Should get Project for BootstrapToken", func() {
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), bootstrapToken)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})
		It("Should get Project for Catalog", func() {
			catalog := &v1alpha1.Catalog{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.CatalogSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), catalog)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get Project for Cluster", func() {
			cluster := &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), cluster)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get Project for Flow", func() {
			flow := &v1alpha1.Flow{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.FlowSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), flow)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get Project for GlobalService", func() {
			r := &v1alpha1.GlobalService{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.GlobalServiceSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), r)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get Project for InfrastructureStack", func() {
			r := &v1alpha1.InfrastructureStack{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.InfrastructureStackSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), r)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get Project for ManagedNamespace", func() {
			r := &v1alpha1.ManagedNamespace{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ManagedNamespaceSpec{
					ProjectRef: &corev1.ObjectReference{
						Name: projectName,
					},
				},
			}
			project, _, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), r)
			Expect(err).NotTo(HaveOccurred())
			Expect(project).ToNot(BeNil())
			Expect(project.Name).To(Equal(projectName))
			Expect(*project.Status.ID).To(Equal(projectID))
		})

		It("Should get error because Project doesn't exist for BootstrapToken", func() {
			bootstrapToken := &v1alpha1.BootstrapToken{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.BootstrapTokenSpec{
					ProjectRef: corev1.ObjectReference{
						Name: "not-existing",
					},
				},
			}

			project, result, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), bootstrapToken)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("projects.deployments.plural.sh \"not-existing\" not found"))
			Expect(result).To(BeNil())
			Expect(project).To(BeNil())
		})

		It("Should Wait for BootstrapToken's Project", func() {
			resource := &v1alpha1.Project{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: projectName, Namespace: namespace}, resource)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Project")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

			Expect(testcommon.MaybeCreate(k8sClient, &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{Name: projectName, Namespace: namespace},
				Spec: v1alpha1.ProjectSpec{
					Name: projectName,
				},
			}, func(p *v1alpha1.Project) {
				p.Status = v1alpha1.Status{}
			})).To(Succeed())

			project, result, err := common.Project(ctx, k8sClient, k8sClient.Scheme(), bootstrapToken)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("project is not ready"))
			Expect(project).To(BeNil())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})
	})
})
