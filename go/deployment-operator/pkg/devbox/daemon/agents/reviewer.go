package agents

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
)

const (
	// reviewThreshold is the probability an allow verdict needs before the reviewer approves without asking.
	reviewThreshold = 0.8
	reviewTimeout   = 20 * time.Second
	// reviewInputLimit caps the tool call JSON sent to the decision model.
	reviewInputLimit = 12 << 10
	// recentPromptLimit and recentPromptCount bound the prompt text kept for the reviewer.
	recentPromptLimit = 2000
	recentPromptCount = 3
	// reviewModel lets the AI proxy pick a decision model from the configured providers.
	reviewModel = "auto"
)

const (
	verdictAllow = "allow"
	verdictDeny  = "deny"
	verdictAsk   = "ask"
)

// ReviewerPrincipal is who answered interactions the daemon's reviewer approved at AUTO.
func ReviewerPrincipal() *devboxv1.Principal {
	return &devboxv1.Principal{Name: "Autonomy: auto (reviewer)", Policy: "autonomy:auto"}
}

const reviewInstructions = `You review actions a coding agent wants to take inside an isolated development sandbox (a disposable ` +
	`container with a git checkout of the user's repositories). The user chose to let safe actions run without asking. ` +
	`Judge the pending tool call against the user's recent requests.`

var verdictChoices = []decisionChoice{
	{Value: verdictAllow, Description: "Routine and clearly in scope for the user's request: reading, searching, editing files in the workspace, " +
		"running builds, tests, linters or package installs, local git operations"},
	{Value: verdictDeny, Description: "Harmful or clearly outside the request: deleting data outside the workspace, force-pushing or rewriting " +
		"shared history, exfiltrating secrets or code, disabling security controls, attacking other systems"},
	{Value: verdictAsk, Description: "Plausible but consequential or ambiguous: pushing to a remote, opening pull requests, deploying, " +
		"changing cloud resources or production systems, sending messages, spending money, or anything you can't judge"},
}

var riskChoices = []decisionChoice{
	{Value: "none", Description: "No meaningful risk"},
	{Value: "destructive", Description: "Deletes or overwrites data that may be hard to recover"},
	{Value: "exfiltration", Description: "Sends code, data or secrets somewhere outside the sandbox"},
	{Value: "credentials", Description: "Reads, changes or uses credentials, tokens or keys"},
	{Value: "out_of_scope", Description: "Unrelated to what the user asked for"},
	{Value: "external", Description: "Changes systems outside the sandbox: remotes, cloud resources, deployments, messages"},
}

type decisionChoice struct {
	Value       string `json:"value"`
	Description string `json:"description,omitempty"`
}

type decisionQuestion struct {
	Type         string           `json:"type"`
	Name         string           `json:"name"`
	Instructions string           `json:"instructions"`
	Choices      []decisionChoice `json:"choices"`
}

type decisionRequest struct {
	Model     string             `json:"model"`
	Input     string             `json:"input"`
	Questions []decisionQuestion `json:"questions"`
}

type decisionAnswer struct {
	Name          string   `json:"name"`
	Choice        any      `json:"choice"`
	Confidence    *float64 `json:"confidence"`
	Probabilities []struct {
		Value       any     `json:"value"`
		Probability float64 `json:"probability"`
	} `json:"probabilities"`
}

type decisionResponse struct {
	Model   string           `json:"model"`
	Answers []decisionAnswer `json:"answers"`
}

// choice is the answer's choice and its probability: the matching entry of probabilities, else confidence.
func (a decisionAnswer) choice() (string, float64) {
	v := fmt.Sprint(a.Choice)
	for _, p := range a.Probabilities {
		if fmt.Sprint(p.Value) == v {
			return v, p.Probability
		}
	}
	if a.Confidence != nil {
		return v, *a.Confidence
	}
	return v, 0
}

// reviewRequest is what the reviewer sees of a permission request, captured under the manager lock.
type reviewRequest struct {
	agent    devboxv1.AgentType
	cwd      string
	prompts  []string
	toolCall map[string]any
}

func (m *Manager) reviewRequestLocked(s *session, toolCall map[string]any) reviewRequest {
	rr := reviewRequest{agent: s.agent, cwd: s.cwd, toolCall: toolCall}
	if t := s.thread; t != nil {
		rr.prompts = append([]string(nil), t.recentPrompts...)
	}
	return rr
}

func (rr reviewRequest) input() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Agent: %s\nWorking directory: %s\n\n", harness.AgentName(rr.agent), rr.cwd)
	b.WriteString("Recent user requests, oldest first:\n")
	if len(rr.prompts) == 0 {
		b.WriteString("(none recorded)\n")
	}
	for i, p := range rr.prompts {
		fmt.Fprintf(&b, "%d. %s\n", i+1, p)
	}
	call, _ := json.MarshalIndent(rr.toolCall, "", "  ")
	if len(call) > reviewInputLimit {
		call = append(call[:reviewInputLimit], []byte("\n... (truncated)")...)
	}
	b.WriteString("\nPending tool call:\n")
	b.Write(call)
	return b.String()
}

// review asks the AI proxy's decision model about a permission request. It always returns a review; one the
// daemon shouldn't act on has escalation set.
func (m *Manager) review(ctx context.Context, rr reviewRequest) *devboxv1.Review {
	base := strings.TrimSuffix(m.opts.Endpoints().GetAiProxyUrl(), "/")
	if base == "" {
		return &devboxv1.Review{Escalation: "no AI proxy is configured"}
	}
	ctx, cancel := context.WithTimeout(ctx, reviewTimeout)
	defer cancel()
	body, _ := json.Marshal(decisionRequest{
		Model: reviewModel,
		Input: rr.input(),
		Questions: []decisionQuestion{
			{Type: "choice", Name: "verdict", Instructions: reviewInstructions + " Should it run without asking the user?", Choices: verdictChoices},
			{Type: "choice", Name: "risk", Instructions: reviewInstructions + " What is the most significant risk of the tool call?", Choices: riskChoices},
		},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/decisions", bytes.NewReader(body))
	if err != nil {
		return &devboxv1.Review{Escalation: "the reviewer failed: " + err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+harness.PlaceholderKey)
	res, err := m.opts.ReviewClient.Do(req)
	if err != nil {
		return &devboxv1.Review{Escalation: "the reviewer failed: " + err.Error()}
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK {
		msg := strings.TrimSpace(string(data))
		if len(msg) > 200 {
			msg = msg[:200] + "..."
		}
		return &devboxv1.Review{Escalation: fmt.Sprintf("the reviewer failed: %s %s", res.Status, msg)}
	}
	var dr decisionResponse
	if err := json.Unmarshal(data, &dr); err != nil {
		return &devboxv1.Review{Escalation: "the reviewer returned an unreadable answer"}
	}
	out := &devboxv1.Review{Model: dr.Model}
	for _, a := range dr.Answers {
		switch a.Name {
		case "verdict":
			out.Verdict, out.Confidence = a.choice()
		case "risk":
			out.Risk, _ = a.choice()
		}
	}
	switch {
	case out.Verdict == verdictDeny:
		out.Escalation = "the reviewer flagged this action"
	case out.Verdict == verdictAsk:
		out.Escalation = "the reviewer wants you to decide"
	case out.Verdict != verdictAllow:
		out.Escalation = "the reviewer gave no verdict"
	case out.Confidence < reviewThreshold:
		out.Escalation = fmt.Sprintf("the reviewer wasn't confident enough (%.0f%%)", out.Confidence*100)
	}
	return out
}

// RecentPrompts are the text of a thread's last few prompts, oldest first.
func (m *Manager) RecentPrompts(threadID string) []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t := m.threads[threadID]; t != nil {
		return append([]string(nil), t.recentPrompts...)
	}
	return nil
}

// notePromptText keeps a prompt's text for the reviewer.
func (t *thread) notePromptText(content []*devboxv1.ContentBlock) {
	var parts []string
	for _, c := range content {
		if txt := c.GetText().GetText(); txt != "" {
			parts = append(parts, txt)
		}
	}
	text := strings.Join(parts, "\n")
	if text == "" {
		return
	}
	if len(text) > recentPromptLimit {
		text = text[:recentPromptLimit] + "..."
	}
	t.recentPrompts = append(t.recentPrompts, text)
	if len(t.recentPrompts) > recentPromptCount {
		t.recentPrompts = t.recentPrompts[len(t.recentPrompts)-recentPromptCount:]
	}
}

// allowOption is the option a reviewer approval selects: allow_once, else allow_always.
func allowOption(pr *devboxv1.PermissionRequest) string {
	byKind := map[string]string{}
	for _, o := range pr.GetOptions() {
		if _, ok := byKind[o.GetKind()]; !ok {
			byKind[o.GetKind()] = o.GetOptionId()
		}
	}
	if id := byKind["allow_once"]; id != "" {
		return id
	}
	return byKind["allow_always"]
}
