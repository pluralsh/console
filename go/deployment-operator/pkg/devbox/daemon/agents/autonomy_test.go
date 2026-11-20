package agents

import (
	"context"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

const subscription = devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION

func autonomyPolicy(def, maxLevel devboxv1.Autonomy) *devboxv1.AutonomyPolicy {
	return &devboxv1.AutonomyPolicy{Default: def, Max: maxLevel}
}

func (h *harnessT) option(id, category string) *devboxv1.ConfigOption {
	for _, o := range h.thread(id).GetConfigOptions() {
		if o.GetCategory() == category {
			return o
		}
	}
	return nil
}

func values(o *devboxv1.ConfigOption) []string {
	var out []string
	for _, v := range o.GetOptions() {
		out = append(out, v.GetValue())
	}
	return out
}

func (h *harnessT) modesSet(t *testing.T) []string {
	var out []string
	for _, c := range h.calls(t, acp.MethodSetMode) {
		out = append(out, acp.Str(c, "modeId"))
	}
	return out
}

func (h *harnessT) setOption(id, configID, value string) error {
	_, err := h.m.SetThreadConfigOption(context.Background(), &devboxv1.ThreadRef{InstanceId: instance, ThreadId: id},
		&devboxv1.ConfigOptionSetting{ConfigId: configID, Value: value})
	return err
}

func TestAutonomyDefaultsToAutoWithinCap(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	h.create(t, "t1")

	o := h.option("t1", autonomyCategory)
	if o.GetCurrentValue() != "auto" || len(values(o)) != 2 || values(o)[1] != "auto" {
		t.Fatalf("autonomy option %v", o)
	}
	if got := h.modesSet(t); len(got) != 1 || got[0] != "auto" {
		t.Fatalf("set_mode calls %v", got)
	}
	if got := values(h.option("t1", "mode")); len(got) != 4 || contains(got, "bypassPermissions") {
		t.Fatalf("reported modes %v", got)
	}
	if err := h.setOption("t1", autonomyCategory, "full"); err == nil {
		t.Fatal("full above the runner's cap was accepted")
	}
	if err := h.setOption("t1", "mode", "bypassPermissions"); err == nil {
		t.Fatal("bypassPermissions above the runner's cap was accepted")
	}
	if err := h.setOption("t1", autonomyCategory, "manual"); err != nil {
		t.Fatal(err)
	}
	if got := h.modesSet(t); got[len(got)-1] != "default" || h.option("t1", autonomyCategory).GetCurrentValue() != "manual" {
		t.Fatalf("after manual: modes %v, option %v", got, h.option("t1", autonomyCategory))
	}
}

func TestAutonomyNoAutoOnProxyBilling(t *testing.T) {
	h := newManager(t, 2)
	h.create(t, "t1")
	if o := h.option("t1", autonomyCategory); o.GetCurrentValue() != "manual" || contains(values(o), "auto") {
		t.Fatalf("autonomy option on proxy billing %v", o)
	}
	if got := values(h.option("t1", "mode")); contains(got, "auto") {
		t.Fatalf("reported modes on proxy billing %v", got)
	}
	if err := h.setOption("t1", "mode", "auto"); err == nil {
		t.Fatal("auto mode accepted on proxy billing")
	}
}

func TestAutonomyFullApprovesByPolicy(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	h.m.SetAutonomy(autonomyPolicy(devboxv1.Autonomy_AUTONOMY_FULL, devboxv1.Autonomy_AUTONOMY_FULL))
	s := h.create(t, "t1")
	if got := h.modesSet(t); len(got) != 1 || got[0] != "bypassPermissions" {
		t.Fatalf("set_mode calls %v", got)
	}

	h.prompt(t, s, "p1", "permission")
	eventually(t, "auto-approved outcome", func() bool { return contains(h.agentText(s.GetSessionId()), "outcome:selected:allow") })
	if len(h.m.Interactions()) != 0 {
		t.Fatalf("pending interactions under full autonomy: %v", h.m.Interactions())
	}
	var answered *devboxv1.Interaction
	for _, ev := range h.rec.snapshot() {
		if in := ev.GetInteraction(); in != nil {
			answered = in
		}
	}
	if answered.GetState() != devboxv1.InteractionState_INTERACTION_STATE_ANSWERED || answered.GetAnsweredBy().GetPolicy() != "autonomy:full" {
		t.Fatalf("recorded interaction %v", answered)
	}
}

func TestAutonomyLowersAgentModeAboveCap(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "mode:bypassPermissions")
	eventually(t, "mode reset to auto", func() bool {
		got := h.modesSet(t)
		return len(got) == 2 && got[1] == "auto" && h.option("t1", autonomyCategory).GetCurrentValue() == "auto"
	})
}

func TestAutonomyFollowsAgentModeWithinCap(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	s := h.create(t, "t1")
	h.prompt(t, s, "p1", "mode:plan")
	eventually(t, "plan mode shows as manual", func() bool { return h.option("t1", autonomyCategory).GetCurrentValue() == "manual" })
}

func TestAutonomyAutoUnavailableAfterModelFallback(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	h.create(t, "t1")
	if err := h.setOption("t1", "model", "smart"); err != nil {
		t.Fatal(err)
	}
	if o := h.option("t1", autonomyCategory); o.GetCurrentValue() != "manual" || contains(values(o), "auto") {
		t.Fatalf("after switching to a model without auto: %v", o)
	}
	if err := h.setOption("t1", autonomyCategory, "auto"); err == nil {
		t.Fatal("auto accepted on a model without auto")
	}
	if err := h.setOption("t1", "model", "fast"); err != nil {
		t.Fatal(err)
	}
	if err := h.setOption("t1", autonomyCategory, "auto"); err != nil {
		t.Fatal(err)
	}
	if got := h.option("t1", autonomyCategory).GetCurrentValue(); got != "auto" {
		t.Fatalf("auto back on a supporting model: %s", got)
	}
}

func TestAutonomyAutoUnavailableAfterModeFallback(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	h.create(t, "t1")
	if err := h.setOption("t1", autonomyCategory, "manual"); err != nil {
		t.Fatal(err)
	}
	if err := h.setOption("t1", "model", "smart"); err != nil {
		t.Fatal(err)
	}
	if err := h.setOption("t1", autonomyCategory, "auto"); err != nil {
		t.Fatal(err)
	}
	o := h.option("t1", autonomyCategory)
	if o.GetCurrentValue() != "manual" || contains(values(o), "auto") || h.option("t1", "mode").GetCurrentValue() != "acceptEdits" {
		t.Fatalf("after the agent fell back from auto: autonomy %v, mode %v", o, h.option("t1", "mode"))
	}
}

func TestAutonomyRestoredOnResume(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	h.m.SetAutonomy(autonomyPolicy(devboxv1.Autonomy_AUTONOMY_MANUAL, devboxv1.Autonomy_AUTONOMY_FULL))
	h.create(t, "t1")
	if err := h.setOption("t1", autonomyCategory, "full"); err != nil {
		t.Fatal(err)
	}
	h.m.StopAgents(func(devboxv1.AgentType, devboxv1.BillingMode) bool { return true })
	if _, err := h.m.ResumeThread(context.Background(), &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1"}, false); err != nil {
		t.Fatal(err)
	}
	if got := h.modesSet(t); got[len(got)-1] != "bypassPermissions" || h.option("t1", autonomyCategory).GetCurrentValue() != "full" {
		t.Fatalf("after resume: modes %v, option %v", got, h.option("t1", autonomyCategory))
	}
}

func TestAutonomyPiNeedsFullCap(t *testing.T) {
	h := newManagerBilling(t, 2, subscription)
	_, err := h.m.CreateThread(context.Background(), &devboxv1.CreateThreadRequest{InstanceId: instance, ThreadId: "pi", Agent: devboxv1.AgentType_AGENT_TYPE_PI})
	if err == nil {
		t.Fatal("pi thread created under autonomy max auto")
	}
}

func TestAutonomyHidesModesItCovers(t *testing.T) {
	m := &Manager{}
	s := &session{options: []*cfgOption{{synthetic: "mode", raw: acp.Object{"id": "mode", "category": "mode", "options": []any{
		map[string]any{"value": "read-only"}, map[string]any{"value": "agent"}, map[string]any{"value": "agent-full-access"},
	}}}}}
	if view := m.modeViewLocked(devboxv1.AgentType_AGENT_TYPE_CODEX, s); view == nil || len(view) != 0 {
		t.Fatalf("codex mode view %v", view)
	}
	s.modeView = acp.Object{}
	if len(s.configProtos()) != 0 {
		t.Fatalf("hidden mode option reported: %v", s.configProtos())
	}
}

func TestAutonomyLevelsWithoutNativeModes(t *testing.T) {
	m := &Manager{autonomyMax: devboxv1.Autonomy_AUTONOMY_FULL}
	got := m.supportedLevelsLocked(devboxv1.AgentType_AGENT_TYPE_OPENCODE, &session{})
	if len(got) != 2 || got[0] != devboxv1.Autonomy_AUTONOMY_MANUAL || got[1] != devboxv1.Autonomy_AUTONOMY_FULL {
		t.Fatalf("opencode levels %v", got)
	}
	if got := m.supportedLevelsLocked(devboxv1.AgentType_AGENT_TYPE_PI, nil); len(got) != 1 || got[0] != devboxv1.Autonomy_AUTONOMY_FULL {
		t.Fatalf("pi levels %v", got)
	}
	if got := clampAutonomy(devboxv1.Autonomy_AUTONOMY_AUTO, []devboxv1.Autonomy{devboxv1.Autonomy_AUTONOMY_MANUAL, devboxv1.Autonomy_AUTONOMY_FULL}); got != devboxv1.Autonomy_AUTONOMY_MANUAL {
		t.Fatalf("clamp auto without auto: %v", got)
	}
}
