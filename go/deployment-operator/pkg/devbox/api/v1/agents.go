package devboxv1

import "strings"

// Name is the agent's name in DevboxRunner.spec.agents[].type ("claude" for AGENT_TYPE_CLAUDE).
func (t AgentType) Name() string {
	return strings.ToLower(strings.TrimPrefix(t.String(), "AGENT_TYPE_"))
}
