package agents

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

// decisionServer is a fake AI proxy decisions route answering every review with the given verdict.
type decisionServer struct {
	*httptest.Server
	mu       sync.Mutex
	requests []decisionRequest
}

func newDecisionServer(t *testing.T, status int, verdict string, probability float64) *decisionServer {
	t.Helper()
	ds := &decisionServer{}
	ds.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ai/v1/decisions" || r.Header.Get("Authorization") != "Bearer "+harness.PlaceholderKey {
			http.Error(w, "unexpected request "+r.URL.Path, http.StatusNotFound)
			return
		}
		body, _ := io.ReadAll(r.Body)
		var req decisionRequest
		_ = json.Unmarshal(body, &req)
		ds.mu.Lock()
		ds.requests = append(ds.requests, req)
		ds.mu.Unlock()
		if status != http.StatusOK {
			http.Error(w, "upstream down", status)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "openai/gpt-6-luna",
			"answers": []any{
				map[string]any{"type": "choice", "name": "verdict", "choice": verdict, "probabilities": []any{
					map[string]any{"value": verdict, "probability": probability},
				}},
				map[string]any{"type": "choice", "name": "risk", "choice": "destructive", "confidence": 0.7},
			},
		})
	}))
	t.Cleanup(ds.Close)
	return ds
}

func (ds *decisionServer) seen() []decisionRequest {
	ds.mu.Lock()
	defer ds.mu.Unlock()
	return append([]decisionRequest(nil), ds.requests...)
}

func newReviewedManager(t *testing.T, ds *decisionServer) *harnessT {
	t.Helper()
	h := newManagerWith(t, 2, devboxv1.BillingMode_BILLING_MODE_PROXY, func(o *Options) {
		o.Endpoints = func() *devboxv1.HarnessEndpoints { return &devboxv1.HarnessEndpoints{AiProxyUrl: ds.URL + "/ai/"} }
	})
	h.m.SetDecisionReview(true)
	return h
}

func lastInteraction(h *harnessT) *devboxv1.Interaction {
	var out *devboxv1.Interaction
	for _, ev := range h.rec.snapshot() {
		if in := ev.GetInteraction(); in != nil {
			out = in
		}
	}
	return out
}

func TestReviewedAutoApprovesConfidentAllow(t *testing.T) {
	ds := newDecisionServer(t, http.StatusOK, verdictAllow, 0.95)
	h := newReviewedManager(t, ds)
	s := h.create(t, "t1")
	if o := h.option("t1", autonomyCategory); o.GetCurrentValue() != "auto" || !contains(values(o), "auto") {
		t.Fatalf("autonomy option with decision review %v", o)
	}
	if got := h.modesSet(t); len(got) != 1 || got[0] != "acceptEdits" {
		t.Fatalf("set_mode calls %v", got)
	}

	h.prompt(t, s, "p1", "permission")
	eventually(t, "reviewer-approved outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:allow") })
	if len(h.m.Interactions()) != 0 {
		t.Fatalf("pending interactions after approval: %v", h.m.Interactions())
	}
	in := lastInteraction(h)
	if in.GetState() != devboxv1.InteractionState_INTERACTION_STATE_ANSWERED || in.GetAnsweredBy().GetPolicy() != "autonomy:auto" ||
		in.GetReview().GetVerdict() != verdictAllow || in.GetReview().GetRisk() != "destructive" || in.GetReview().GetModel() != "openai/gpt-6-luna" {
		t.Fatalf("recorded interaction %v", in)
	}
	reqs := ds.seen()
	if len(reqs) != 1 || reqs[0].Model != reviewModel || !strings.Contains(reqs[0].Input, "rm -rf build") ||
		!strings.Contains(reqs[0].Input, "1. permission") || len(reqs[0].Questions) != 2 {
		t.Fatalf("decision requests %+v", reqs)
	}
}

func TestReviewedAutoEscalatesToHuman(t *testing.T) {
	for name, ds := range map[string]*decisionServer{
		"ask":            newDecisionServer(t, http.StatusOK, verdictAsk, 0.9),
		"deny":           newDecisionServer(t, http.StatusOK, verdictDeny, 0.9),
		"low confidence": newDecisionServer(t, http.StatusOK, verdictAllow, 0.55),
		"proxy error":    newDecisionServer(t, http.StatusBadGateway, "", 0),
	} {
		t.Run(name, func(t *testing.T) {
			h := newReviewedManager(t, ds)
			s := h.create(t, "t1")
			h.prompt(t, s, "p1", "permission")
			eventually(t, "escalated interaction", func() bool { return len(h.m.Interactions()) == 1 })
			in := h.m.Interactions()[0]
			if in.GetReview().GetEscalation() == "" || in.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING {
				t.Fatalf("escalated interaction %v", in)
			}
			resp := &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
				Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "reject"}}}}
			if _, err := h.m.RespondInteraction(&devboxv1.RespondInteractionRequest{InteractionId: in.GetInteractionId(), Response: resp}); err != nil {
				t.Fatal(err)
			}
			eventually(t, "human outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:reject") })
		})
	}
}

func TestReviewedAutoLevels(t *testing.T) {
	m := &Manager{autonomyMax: devboxv1.Autonomy_AUTONOMY_FULL, decisionReview: true}
	if got := m.supportedLevelsLocked(devboxv1.AgentType_AGENT_TYPE_OPENCODE, &session{}); len(got) != 3 {
		t.Fatalf("opencode levels with decision review %v", got)
	}
	if got := m.supportedLevelsLocked(devboxv1.AgentType_AGENT_TYPE_PI, nil); len(got) != 1 || got[0] != devboxv1.Autonomy_AUTONOMY_FULL {
		t.Fatalf("pi levels with decision review %v", got)
	}
}
