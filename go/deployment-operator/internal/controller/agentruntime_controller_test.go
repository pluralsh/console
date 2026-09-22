package controller

import (
	"context"
	"errors"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestAgentRuntimeReconcileImageWarmer(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())

	image := "example.com/repository:v1"
	agentRuntime := &v1alpha1.AgentRuntime{
		ObjectMeta: metav1.ObjectMeta{Name: "claude", UID: types.UID("runtime-uid")},
		Spec: v1alpha1.AgentRuntimeSpec{
			RepositoryImage: &image,
			Prewarm:         &v1alpha1.RepositoryImagePrewarm{Cron: "0 * * * *"},
		},
	}
	k8sClient := fake.NewClientBuilder().WithScheme(scheme).Build()
	reconciler := &AgentRuntimeReconciler{
		Client:            k8sClient,
		Scheme:            scheme,
		OperatorNamespace: "plrl-deploy-operator",
	}

	g.Expect(reconciler.reconcileImageWarmer(context.Background(), agentRuntime)).To(Succeed())
	g.Expect(agentRuntime.Status.ImageWarmerName).NotTo(BeNil())
	g.Expect(*agentRuntime.Status.ImageWarmerName).To(MatchRegexp(`^claude-[a-z0-9]{4}$`))

	key := client.ObjectKey{Name: *agentRuntime.Status.ImageWarmerName, Namespace: reconciler.OperatorNamespace}
	warmer := &v1alpha1.ImageWarmer{}
	g.Expect(k8sClient.Get(context.Background(), key, warmer)).To(Succeed())
	g.Expect(warmer.Spec.Image).To(Equal(image))
	g.Expect(metav1.IsControlledBy(warmer, agentRuntime)).To(BeTrue())

	agentRuntime.Spec.Prewarm = nil
	g.Expect(reconciler.reconcileImageWarmer(context.Background(), agentRuntime)).To(Succeed())
	g.Expect(agentRuntime.Status.ImageWarmerName).To(BeNil())
	err := k8sClient.Get(context.Background(), key, &v1alpha1.ImageWarmer{})
	g.Expect(k8serrors.IsNotFound(err)).To(BeTrue())
}

func TestCreateAgentRunPropagatesWorkbenchMCPURL(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())

	k8sClient := fake.NewClientBuilder().WithScheme(scheme).Build()
	reconciler := &AgentRuntimeReconciler{Client: k8sClient}
	agentRuntime := &v1alpha1.AgentRuntime{
		ObjectMeta: metav1.ObjectMeta{Name: "runtime"},
		Spec: v1alpha1.AgentRuntimeSpec{
			TargetNamespace: "agents",
		},
	}
	workbenchMCPURL := "https://console.example/mcp/workbench/workbench-id"
	run := &console.AgentRunFragment{
		ID:              "run-id",
		Prompt:          "investigate",
		Repository:      "https://github.com/pluralsh/console",
		Mode:            console.AgentRunModeAnalyze,
		WorkbenchMcpURL: &workbenchMCPURL,
		Runtime:         &console.AgentRuntimeFragment{Name: "runtime"},
	}

	g.Expect(reconciler.createAgentRun(context.Background(), agentRuntime, run)).To(Succeed())
	created := &v1alpha1.AgentRun{}
	g.Expect(k8sClient.Get(context.Background(), client.ObjectKey{Name: run.ID, Namespace: "agents"}, created)).To(Succeed())
	g.Expect(created.Spec.WorkbenchMCPURL).NotTo(BeNil())
	g.Expect(*created.Spec.WorkbenchMCPURL).To(Equal(workbenchMCPURL))
}

var _ = Describe("AgentRuntime Controller", func() {
	Describe("createRunFromID", func() {
		It("retries pending run fetches and fails the run with the GraphQL error", func() {
			previousDelay := pendingAgentRunFetchDelay
			pendingAgentRunFetchDelay = 0
			DeferCleanup(func() {
				pendingAgentRunFetchDelay = previousDelay
			})

			runID := "run-123"
			gqlErr := errors.New("graphql: pending run is unavailable")
			consoleClient := mocks.NewClientMock(GinkgoT())
			consoleClient.EXPECT().
				GetAgentRun(mock.Anything, runID).
				Return(nil, gqlErr).
				Times(pendingAgentRunFetchRetries + 1)
			consoleClient.EXPECT().
				UpdateAgentRun(mock.Anything, runID, mock.MatchedBy(func(attrs console.AgentRunStatusAttributes) bool {
					return attrs.Status == console.AgentRunStatusFailed &&
						attrs.Error != nil &&
						*attrs.Error == gqlErr.Error()
				})).
				Return(&console.AgentRunFragment{ID: runID}, nil).
				Once()

			reconciler := &AgentRuntimeReconciler{
				Ctx:           context.Background(),
				ConsoleClient: consoleClient,
			}

			err := reconciler.createRunFromID(runID)
			Expect(err).To(MatchError(ContainSubstring("failed to get agent run after retries")))
			Expect(err).To(MatchError(ContainSubstring(gqlErr.Error())))
		})
	})
})
