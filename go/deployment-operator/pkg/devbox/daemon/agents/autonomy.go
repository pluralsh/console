package agents

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

// autonomyCategory is the category (and id) of the synthetic config option for a thread's autonomy.
const autonomyCategory = "autonomy"

// nativeModes are the ACP session modes that implement each autonomy level, for agents whose modes cover them.
// A level is native only when the session offers its mode.
var nativeModes = map[devboxv1.AgentType]map[devboxv1.Autonomy]string{
	devboxv1.AgentType_AGENT_TYPE_CLAUDE: {
		devboxv1.Autonomy_AUTONOMY_MANUAL: "default",
		devboxv1.Autonomy_AUTONOMY_AUTO:   "auto",
		devboxv1.Autonomy_AUTONOMY_FULL:   "bypassPermissions",
	},
	devboxv1.AgentType_AGENT_TYPE_CODEX: {
		devboxv1.Autonomy_AUTONOMY_MANUAL: "read-only",
		devboxv1.Autonomy_AUTONOMY_AUTO:   "agent",
		devboxv1.Autonomy_AUTONOMY_FULL:   "agent-full-access",
	},
	devboxv1.AgentType_AGENT_TYPE_GEMINI: {
		devboxv1.Autonomy_AUTONOMY_MANUAL: "default",
		devboxv1.Autonomy_AUTONOMY_FULL:   "yolo",
	},
}

// reviewedModes are the session modes a thread runs in at AUTO when the daemon's reviewer answers its permission
// requests: the agent applies file edits itself and asks about the rest. Agents without one (OpenCode) ask about
// everything and the reviewer answers it all.
var reviewedModes = map[devboxv1.AgentType]string{
	devboxv1.AgentType_AGENT_TYPE_CLAUDE: "acceptEdits",
	devboxv1.AgentType_AGENT_TYPE_CODEX:  "read-only",
	devboxv1.AgentType_AGENT_TYPE_GEMINI: "autoEdit",
}

var autonomyLevels = []devboxv1.Autonomy{devboxv1.Autonomy_AUTONOMY_MANUAL, devboxv1.Autonomy_AUTONOMY_AUTO, devboxv1.Autonomy_AUTONOMY_FULL}

var autonomyDescriptions = map[devboxv1.Autonomy]string{
	devboxv1.Autonomy_AUTONOMY_MANUAL: "Ask before every action that needs permission",
	devboxv1.Autonomy_AUTONOMY_AUTO:   "A reviewer approves safe actions and asks you about the rest",
	devboxv1.Autonomy_AUTONOMY_FULL:   "Approve everything without asking",
}

// AutonomyValue is a level's config option value: manual, auto or full.
func AutonomyValue(a devboxv1.Autonomy) string {
	return strings.ToLower(strings.TrimPrefix(a.String(), "AUTONOMY_"))
}

func autonomyOfValue(v string) devboxv1.Autonomy {
	return devboxv1.Autonomy(devboxv1.Autonomy_value["AUTONOMY_"+strings.ToUpper(v)])
}

// SetAutonomy sets the runner's autonomy policy. Unset fields default to AUTO.
func (m *Manager) SetAutonomy(p *devboxv1.AutonomyPolicy) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.autonomyDefault, m.autonomyMax = p.GetDefault(), p.GetMax()
}

// SetDecisionReview sets whether the AI proxy serves decisions, which lets AUTO run with the daemon reviewing
// permission requests where the agent's own reviewer isn't available.
func (m *Manager) SetDecisionReview(on bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.decisionReview = on
}

func (m *Manager) autonomyMaxLocked() devboxv1.Autonomy {
	if m.autonomyMax == devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		return devboxv1.Autonomy_AUTONOMY_AUTO
	}
	return m.autonomyMax
}

func (m *Manager) autonomyDefaultLocked() devboxv1.Autonomy {
	if m.autonomyDefault == devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		return devboxv1.Autonomy_AUTONOMY_AUTO
	}
	return m.autonomyDefault
}

// modeOption is the session's mode-category option, if any.
func modeOption(s *session) *cfgOption {
	if s == nil {
		return nil
	}
	for _, o := range s.options {
		if o.category() == modeCategory {
			return o
		}
	}
	return nil
}

func currentModel(s *session) string {
	if s == nil {
		return ""
	}
	for _, o := range s.options {
		if o.category() == modelCategory {
			return acp.Str(o.raw, "currentValue")
		}
	}
	return ""
}

// noteAutoFallbackLocked records the current model as lacking Auto when the session left its auto mode though
// nobody asked for another mode: Claude answers auto with acceptEdits on models without Auto support, both when
// auto is selected and when the model is switched under it.
func noteAutoFallbackLocked(s *session, wasAuto bool, requestedMode string) {
	auto := nativeModes[s.agent][devboxv1.Autonomy_AUTONOMY_AUTO]
	mo := modeOption(s)
	if auto == "" || mo == nil || acp.Str(mo.raw, "currentValue") == auto {
		return
	}
	if requestedMode == auto || (wasAuto && requestedMode == "") {
		if s.noAuto == nil {
			s.noAuto = map[string]bool{}
		}
		s.noAuto[currentModel(s)] = true
	}
}

// nativeMode is the session mode implementing a level, or "" when the daemon implements it by answering
// permission requests itself.
func nativeMode(agent devboxv1.AgentType, s *session, level devboxv1.Autonomy) string {
	return offeredMode(s, nativeModes[agent][level])
}

func offeredMode(s *session, mode string) string {
	if o := modeOption(s); mode != "" && o != nil && optionAllows(o.raw, mode) {
		return mode
	}
	return ""
}

// nativeAutoLocked is whether AUTO runs on the agent's own reviewer.
func (m *Manager) nativeAutoLocked(agent devboxv1.AgentType, s *session) bool {
	return nativeMode(agent, s, devboxv1.Autonomy_AUTONOMY_AUTO) != "" && m.autoAllowedLocked(agent, s)
}

// reviewedAutoLocked is whether AUTO runs with the daemon's reviewer answering permission requests.
func (m *Manager) reviewedAutoLocked(agent devboxv1.AgentType, s *session) bool {
	return !m.nativeAutoLocked(agent, s) && (m.decisionReview || m.probe) && agent != devboxv1.AgentType_AGENT_TYPE_PI
}

// levelModeLocked is the session mode a thread runs in at a level: the native mode, or at reviewed AUTO the
// reviewed mode. "" leaves the mode as is.
func (m *Manager) levelModeLocked(agent devboxv1.AgentType, s *session, level devboxv1.Autonomy) string {
	if level == devboxv1.Autonomy_AUTONOMY_AUTO && m.reviewedAutoLocked(agent, s) {
		return offeredMode(s, reviewedModes[agent])
	}
	return nativeMode(agent, s, level)
}

// reviewingLocked is whether the daemon's reviewer answers a thread's permission requests.
func (m *Manager) reviewingLocked(t *thread) bool {
	return t != nil && t.autonomy == devboxv1.Autonomy_AUTONOMY_AUTO && t.autonomy <= m.autonomyMaxLocked() &&
		m.reviewedAutoLocked(t.agent, t.session)
}

// supportedLevelsLocked lists the levels an agent can run at, within the runner's cap. Without a native mode the
// daemon implements MANUAL (forward every request), AUTO (its reviewer answers, given decision review) and FULL
// (approve every request); Pi never asks, so it only runs at FULL.
func (m *Manager) supportedLevelsLocked(agent devboxv1.AgentType, s *session) []devboxv1.Autonomy {
	limit := m.autonomyMaxLocked()
	var out []devboxv1.Autonomy
	for _, l := range autonomyLevels {
		if l > limit {
			break
		}
		switch {
		case agent == devboxv1.AgentType_AGENT_TYPE_PI:
			if l == devboxv1.Autonomy_AUTONOMY_FULL {
				out = append(out, l)
			}
		case l == devboxv1.Autonomy_AUTONOMY_AUTO:
			if m.nativeAutoLocked(agent, s) || m.reviewedAutoLocked(agent, s) {
				out = append(out, l)
			}
		default:
			out = append(out, l)
		}
	}
	return out
}

// autoAllowedLocked is false where the agent's own reviewer can't run: on models it fell back from auto on, and
// on AI proxy billing, whose routes reject the reviewers' unprefixed model ids (Codex's codex-auto-review).
func (m *Manager) autoAllowedLocked(agent devboxv1.AgentType, s *session) bool {
	if s != nil && s.noAuto[currentModel(s)] {
		return false
	}
	return m.probe || m.launchForLocked(agent).GetBilling() == devboxv1.BillingMode_BILLING_MODE_SUBSCRIPTION
}

// clampAutonomy picks the highest supported level at or below want, else the lowest supported one.
func clampAutonomy(want devboxv1.Autonomy, supported []devboxv1.Autonomy) devboxv1.Autonomy {
	out := devboxv1.Autonomy_AUTONOMY_UNSPECIFIED
	for _, l := range supported {
		if l <= want {
			out = l
		}
	}
	if out == devboxv1.Autonomy_AUTONOMY_UNSPECIFIED && len(supported) > 0 {
		out = supported[0]
	}
	return out
}

// checkAutonomyLocked fails thread creation for agents that can't run within the runner's cap.
func (m *Manager) checkAutonomyLocked(agent devboxv1.AgentType) error {
	if len(m.supportedLevelsLocked(agent, nil)) == 0 {
		return derr.InvalidAgentOrModel(fmt.Sprintf("%s never asks for permission, so it needs autonomy max: full on the runner", harness.AgentName(agent)))
	}
	return nil
}

// modeLevel is the level a native session mode corresponds to; modes outside the mapping (Claude's acceptEdits
// and plan) still ask for commands, so they count as MANUAL.
func modeLevel(agent devboxv1.AgentType, mode string) devboxv1.Autonomy {
	for l, m := range nativeModes[agent] {
		if m == mode {
			return l
		}
	}
	return devboxv1.Autonomy_AUTONOMY_MANUAL
}

// syncAutonomyLocked rebuilds a thread session's autonomy option. For native agents the level follows the
// session mode, so mode changes the agent makes itself (leaving plan mode, say) show up; a mode above the cap is
// reset in the background.
func (m *Manager) syncAutonomyLocked(s *session) {
	t := s.thread
	if t == nil || t.session != s {
		return
	}
	// Only a level implemented by a mode follows the mode; a daemon-implemented level keeps whatever mode is set.
	if mo := modeOption(s); mo != nil && t.autonomy != devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		cur := acp.Str(mo.raw, "currentValue")
		if want := m.levelModeLocked(t.agent, s, t.autonomy); want != "" && cur != want {
			t.autonomy = modeLevel(t.agent, cur)
			t.dirty, m.dirty = true, true
		}
	}
	supported := m.supportedLevelsLocked(t.agent, s)
	if t.autonomy > m.autonomyMaxLocked() && !t.lowering {
		t.lowering = true
		target := clampAutonomy(m.autonomyMaxLocked(), supported)
		go func() {
			m.mu.Lock()
			c := m.conns[t.agent]
			m.mu.Unlock()
			if c != nil {
				if err := m.applyAutonomy(m.ctx, c, t, target); err != nil {
					m.log.Warn("lowering thread autonomy to the runner's cap", "thread", t.id, "err", err)
				}
			}
			m.mu.Lock()
			t.lowering = false
			m.mu.Unlock()
		}()
	}
	if view := m.modeViewLocked(t.agent, s); !bytes.Equal(acp.MustJSON(view), acp.MustJSON(s.modeView)) {
		s.modeView = view
		m.markDirtyLocked(s)
	}
	values := make([]any, 0, len(supported))
	for _, l := range supported {
		values = append(values, map[string]any{"value": AutonomyValue(l), "name": strings.ToUpper(AutonomyValue(l)[:1]) + AutonomyValue(l)[1:], "description": autonomyDescriptions[l]})
	}
	cur := ""
	if t.autonomy != devboxv1.Autonomy_AUTONOMY_UNSPECIFIED {
		cur = AutonomyValue(t.autonomy)
	}
	raw := acp.Object{
		"id": autonomyCategory, "name": "Autonomy", "category": autonomyCategory, "type": "select",
		"description": "How the agent's permission requests are answered", "currentValue": cur, "options": values,
	}
	for _, o := range s.options {
		if o.synthetic == autonomyCategory {
			if !bytes.Equal(acp.MustJSON(o.raw), acp.MustJSON(raw)) {
				o.raw = raw
				m.markDirtyLocked(s)
			}
			return
		}
	}
	s.options = append(s.options, &cfgOption{synthetic: autonomyCategory, raw: raw})
	m.markDirtyLocked(s)
}

// modeViewLocked is how a native agent's mode option is shown next to autonomy: hidden when every mode is an
// autonomy level (Codex), otherwise without the modes above the cap (Claude keeps acceptEdits and plan).
func (m *Manager) modeViewLocked(agent devboxv1.AgentType, s *session) acp.Object {
	mo := modeOption(s)
	if mo == nil || nativeModes[agent] == nil {
		return nil
	}
	native := map[string]bool{}
	for _, id := range nativeModes[agent] {
		native[id] = true
	}
	covered := true
	var kept []any
	for _, v := range acp.Arr(mo.raw, "options") {
		vo, ok := v.(map[string]any)
		if !ok {
			continue
		}
		id := acp.Str(vo, "value")
		covered = covered && native[id]
		if m.modeAllowedLocked(agent, s, id) == nil {
			kept = append(kept, v)
		}
	}
	if covered {
		return acp.Object{}
	}
	view := acp.CloneJSON(mo.raw).(map[string]any)
	view["options"] = kept
	return view
}

// applyAutonomy moves a thread to a level: the native session mode when there is one, then the daemon's own
// answering policy.
func (m *Manager) applyAutonomy(ctx context.Context, c *agentConn, t *thread, want devboxv1.Autonomy) error {
	m.mu.Lock()
	s := t.session
	if s == nil {
		m.mu.Unlock()
		return derr.ThreadNotFound(t.id)
	}
	supported := m.supportedLevelsLocked(t.agent, s)
	if !containsLevel(supported, want) {
		m.mu.Unlock()
		return derr.InvalidAgentOrModel(fmt.Sprintf("autonomy %s is not available for %s on this runner", AutonomyValue(want), harness.AgentName(t.agent)))
	}
	mode := m.levelModeLocked(t.agent, s, want)
	mo := modeOption(s)
	m.mu.Unlock()

	if mode != "" && acp.Str(mo.raw, "currentValue") != mode {
		if _, err := m.setConfig(ctx, c, s, mo.id(), mode); err != nil {
			return err
		}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	t.autonomy = want
	if cur := acp.Str(modeOption(s).raw, "currentValue"); mode != "" && cur != mode {
		t.autonomy = modeLevel(t.agent, cur)
		if cur == reviewedModes[t.agent] && want == devboxv1.Autonomy_AUTONOMY_AUTO && m.reviewedAutoLocked(t.agent, s) {
			t.autonomy = want
		}
	}
	t.dirty, m.dirty = true, true
	m.syncAutonomyLocked(s)
	m.emitConfigLocked(s)
	return nil
}

func containsLevel(levels []devboxv1.Autonomy, l devboxv1.Autonomy) bool {
	for _, x := range levels {
		if x == l {
			return true
		}
	}
	return false
}

// modeAllowedLocked rejects session modes above the runner's autonomy cap, and the auto mode where AUTO isn't
// available.
func (m *Manager) modeAllowedLocked(agent devboxv1.AgentType, s *session, mode string) error {
	if nativeModes[agent] == nil {
		return nil
	}
	lvl := modeLevel(agent, mode)
	if lvl > m.autonomyMaxLocked() {
		return derr.InvalidAgentOrModel(fmt.Sprintf("mode %s needs autonomy %s, above this runner's max of %s", mode, AutonomyValue(lvl), AutonomyValue(m.autonomyMaxLocked())))
	}
	if lvl == devboxv1.Autonomy_AUTONOMY_AUTO && !m.autoAllowedLocked(agent, s) {
		return derr.InvalidAgentOrModel(fmt.Sprintf("mode %s needs autonomy auto, which isn't available for %s with this model and billing", mode, harness.AgentName(agent)))
	}
	return nil
}

// autoApproveLocked answers a permission request by policy when the thread runs at FULL. It prefers the option
// that keeps the thread's native mode (Claude's plan exit offers one per mode), then allow_once, then
// allow_always.
func (m *Manager) autoApproveLocked(s *session, pr *devboxv1.PermissionRequest) string {
	t := s.thread
	if t == nil || t.autonomy != devboxv1.Autonomy_AUTONOMY_FULL || t.autonomy > m.autonomyMaxLocked() {
		return ""
	}
	byKind := map[string]string{}
	mode := nativeMode(t.agent, t.session, t.autonomy)
	for _, o := range pr.GetOptions() {
		if mode != "" && o.GetOptionId() == mode {
			return o.GetOptionId()
		}
		if _, ok := byKind[o.GetKind()]; !ok {
			byKind[o.GetKind()] = o.GetOptionId()
		}
	}
	if id := byKind["allow_once"]; id != "" {
		return id
	}
	return byKind["allow_always"]
}

// AutonomyPrincipal is who answered interactions the daemon approved by policy.
func AutonomyPrincipal(level devboxv1.Autonomy) *devboxv1.Principal {
	return &devboxv1.Principal{Name: "Autonomy: " + AutonomyValue(level), Policy: "autonomy:" + AutonomyValue(level)}
}
