package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("ClusterSync Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			name       = "test-syn-cluster"
			namespace  = "default"
			handleName = "test-sync"
			version    = "v1.2.0"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ClusterSync")
			clusterSync := &v1alpha1.ClusterSync{}
			err := k8sClient.Get(ctx, typeNamespacedName, clusterSync)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ClusterSync{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.ClusterSyncSpec{
						ClusterSpec: v1alpha1.ClusterSpecTemplate{
							Metadata: v1alpha1.MetadataTemplate{
								Name: "{{ .cluster.handle }}",
							},
							Spec: v1alpha1.SpecTemplate{
								Handle:   lo.ToPtr("{{ .cluster.handle }}"),
								Version:  lo.ToPtr("{{ if .cluster.version }}{{ .cluster.version }}{{ else }}null{{ end }}"),
								Protect:  lo.ToPtr("{{ if .cluster.protect }}{{ .cluster.protect }}{{ else }}false{{ end }}"),
								Tags:     lo.ToPtr("{ {{- range $i, $t := .cluster.tags }}{{ if $i }}, {{ end }}{{ $t.name }}: {{ $t.value }}{{- end }} }"),
								Metadata: lo.ToPtr("{{ .cluster.metadata | toYaml | nindent 8}}"),
								Bindings: &v1alpha1.BindingsTemplate{
									Read:  lo.ToPtr(`{{ if .cluster.readBindings }}{{ range .cluster.readBindings }}{{ printf "\n  - UserID: %s" .user.id | nindent 2 }}{{ end }}{{ else }}null{{ end }}`),
									Write: lo.ToPtr(`{{ if .cluster.writeBindings }}{{ range .cluster.writeBindings }}{{ printf "\n  - UserID: %s" .user.id | nindent 2 }}{{ end }}{{ else }}null{{ end }}`),
								},
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}

		})

		AfterAll(func() {
			clusterSync := &v1alpha1.ClusterSync{}
			if err := k8sClient.Get(ctx, typeNamespacedName, clusterSync); err == nil {
				By("Cleanup the specific resource instance ClusterSync")
				Expect(k8sClient.Delete(ctx, clusterSync)).To(Succeed())
			}
		})

		It("template full cluster", func() {
			By("Update resource")

			var list []*gqlclient.ClusterEdgeFragment
			list = append(list, &gqlclient.ClusterEdgeFragment{
				Node: &gqlclient.ClusterFragment{
					Handle:  lo.ToPtr(handleName),
					Version: lo.ToPtr(version),
					Protect: lo.ToPtr(false),
					Metadata: map[string]any{
						"name": "test",
					},
					Tags: []*gqlclient.ClusterTags{
						{
							Name:  "a",
							Value: "b",
						},
					},
					WriteBindings: []*gqlclient.PolicyBindingFragment{
						{
							User: &gqlclient.UserFragment{
								ID: "123",
							},
						},
					},
					ReadBindings: []*gqlclient.PolicyBindingFragment{
						{
							User: &gqlclient.UserFragment{
								ID: "123",
							},
						},
					},
				}})
			test := struct {
				fragment       *gqlclient.ListClustersWithParameters_Clusters
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					Conditions: []metav1.Condition{
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
				fragment: &gqlclient.ListClustersWithParameters_Clusters{
					PageInfo: gqlclient.PageInfoFragment{},
					Edges:    list,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("ListClustersWithParameters", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(test.fragment, nil)

			r := &controller.ClusterSyncReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := r.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			clusterSync := &v1alpha1.ClusterSync{}
			err = k8sClient.Get(ctx, typeNamespacedName, clusterSync)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(clusterSync.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

			cluster := &v1alpha1.Cluster{}
			err = k8sClient.Get(ctx, types.NamespacedName{Namespace: clusterSync.Namespace, Name: handleName}, cluster)
			Expect(err).NotTo(HaveOccurred())

		})

	})

})
