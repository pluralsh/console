package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

type staticAgentsGate bool

func (g staticAgentsGate) AgentsEnabled(context.Context) (bool, error) { return bool(g), nil }

func agentsGateServer(t *testing.T, body string) (*httptest.Server, *atomic.Int32) {
	t.Helper()
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv, &calls
}

func TestConsoleAgentsGate(t *testing.T) {
	t.Run("reads agentsEnabled and caches it", func(t *testing.T) {
		g := NewWithT(t)
		srv, calls := agentsGateServer(t, `{"data":{"myCluster":{"agentsEnabled":false}}}`)
		gate := NewConsoleAgentsGate(srv.URL, "token")

		for range 3 {
			enabled, err := gate.AgentsEnabled(context.Background())
			g.Expect(err).NotTo(HaveOccurred())
			g.Expect(enabled).To(BeFalse())
		}
		g.Expect(calls.Load()).To(BeEquivalentTo(1))
	})

	t.Run("allows agents on consoles without the field", func(t *testing.T) {
		g := NewWithT(t)
		srv, _ := agentsGateServer(t, `{"errors":[{"message":"Cannot query field \"agentsEnabled\" on type \"Cluster\"."}]}`)
		enabled, err := NewConsoleAgentsGate(srv.URL, "token").AgentsEnabled(context.Background())
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(enabled).To(BeTrue())
	})

	t.Run("returns other errors without caching", func(t *testing.T) {
		g := NewWithT(t)
		srv, calls := agentsGateServer(t, `{"errors":[{"message":"unauthorized"}]}`)
		gate := NewConsoleAgentsGate(srv.URL, "token")
		_, err := gate.AgentsEnabled(context.Background())
		g.Expect(err).To(HaveOccurred())
		_, err = gate.AgentsEnabled(context.Background())
		g.Expect(err).To(HaveOccurred())
		g.Expect(calls.Load()).To(BeEquivalentTo(2))
	})
}

func TestAgentRuntimeReconcileAgentsNotAllowed(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())

	agentRuntime := &v1alpha1.AgentRuntime{
		ObjectMeta: metav1.ObjectMeta{Name: "claude"},
		Spec:       v1alpha1.AgentRuntimeSpec{Type: console.AgentRuntimeTypeClaude, TargetNamespace: "agents"},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(agentRuntime).
		WithStatusSubresource(&v1alpha1.AgentRuntime{}).
		Build()
	reconciler := &AgentRuntimeReconciler{
		Client:        k8sClient,
		Scheme:        scheme,
		ConsoleClient: mocks.NewClientMock(t),
		Agents:        staticAgentsGate(false),
	}

	result, err := reconciler.Reconcile(context.Background(), ctrl.Request{NamespacedName: client.ObjectKeyFromObject(agentRuntime)})
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(result.RequeueAfter).To(BeNumerically(">=", requeueAgentsNotAllowed))

	persisted := &v1alpha1.AgentRuntime{}
	g.Expect(k8sClient.Get(context.Background(), client.ObjectKeyFromObject(agentRuntime), persisted)).To(Succeed())
	for _, ct := range []v1alpha1.ConditionType{v1alpha1.ReadyConditionType, v1alpha1.SynchronizedConditionType} {
		cond := meta.FindStatusCondition(persisted.Status.Conditions, ct.String())
		g.Expect(cond).NotTo(BeNil())
		g.Expect(cond.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(cond.Reason).To(Equal(AgentsNotAllowedReason.String()))
		g.Expect(cond.Message).To(Equal(AgentsNotAllowedMessage))
	}
	g.Expect(persisted.Status.ID).To(BeNil())
}
