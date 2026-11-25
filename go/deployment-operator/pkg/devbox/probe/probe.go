// Package probe is the agent probe handoff between the deployment operator (internal/controller) and
// devbox-gateway (pkg/devbox/gateway/prober), section 4.2a of the DevBoxes plan.
//
// The golden boot only runs the bootstrap script and mise; the agent probe runs once the golden tag exists, from
// an actor the gateway resumes from that tag, because only the gateway can reach a daemon (through atenet-router).
// The probe needs a box-scoped AI proxy token (console's mintDevboxProbeToken, which only the operator calls), so
// adapters that list models only when authenticated still work.
//
// Contract, in the operator namespace:
//
//	ConfigMap devbox-probe-<runner>-r<revision> (ConfigMapName), one per revision:
//	  labels:  devboxes.plural.sh/probe=request, devboxes.plural.sh/runner=<runner>,
//	           devboxes.plural.sh/revision=<revision>
//	  data["request.json"]: Request, written by the operator. Its "probe" field is a protojson
//	                        devbox.v1.ProbeAgentsRequest without endpoints; the gateway fills them in.
//
//	Secret devbox-probe-tokens (TokenSecretName), shared by all requests:
//	  data[<ConfigMap name>]: Token as JSON. Request.TokenSecret names the Secret and key. The operator writes
//	                          the key before it creates the ConfigMap, re-mints it while the probe is pending
//	                          and the token is close to expiry, and deletes it with the ConfigMap. The gateway's
//	                          ServiceAccount may only get this one Secret.
//
// The gateway watches pending ConfigMaps (no probe-state annotation). One replica claims a request with the
// probe-claim annotation ("<gateway id> <RFC 3339 time>", an optimistic update, so only one wins), registers the
// token with egress for a pseudo-instance, creates an actor in request.atespace from request.goldenTag, applies
// an egress policy that injects the token on the AI proxy host, calls Daemon.ProbeAgents, deletes the actor and
// writes back, in one update:
//
//	metadata.annotations["devboxes.plural.sh/probe-state"]: "done" or "failed"
//	data["result.json"]: protojson devbox.v1.ProbeAgentsResponse (when done)
//	data["error"]:       why the probe could not run (when failed; the gateway retries transient errors first)
//
// A claim older than ClaimTTL is abandoned (its gateway died) and may be taken over.
package probe

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"time"
)

const (
	Label           = "devboxes.plural.sh/probe"
	LabelRequest    = "request"
	RunnerLabel     = "devboxes.plural.sh/runner"
	RevisionLabel   = "devboxes.plural.sh/revision"
	StateAnnotation = "devboxes.plural.sh/probe-state"
	ClaimAnnotation = "devboxes.plural.sh/probe-claim"
	StateDone       = "done"
	StateFailed     = "failed"
	RequestKey      = "request.json"
	ResultKey       = "result.json"
	ErrorKey        = "error"

	// TokenSecretName is the Secret holding every pending request's probe token, keyed by ConfigMap name.
	TokenSecretName = "devbox-probe-tokens"

	// ClaimTTL bounds how long a gateway may hold a claim without finishing.
	ClaimTTL = 20 * time.Minute
)

// Request is request.json. The operator embeds it in its own type, which adds the declared agents.
type Request struct {
	Runner        string `json:"runner"`
	Atespace      string `json:"atespace"`
	ActorTemplate string `json:"actorTemplate"`
	Revision      int64  `json:"revision"`
	GoldenTag     string `json:"goldenTag"`
	// ExternalHome means the template's home is a JuiceFS or ZeroFS volume, which Substrate won't seed from an
	// explicit tag: the probe actor starts from the template's golden tag by default instead. The JSON name
	// predates ZeroFS; it stays so operators and gateways of either version read each other's requests.
	ExternalHome bool `json:"juiceFSHome,omitempty"`
	// DevboxID is the console Devbox the probe token is scoped to.
	DevboxID string `json:"devboxId"`
	// Probe is a protojson devbox.v1.ProbeAgentsRequest.
	Probe json.RawMessage `json:"probe,omitempty"`
	// TokenSecret locates the probe token.
	TokenSecret *TokenRef `json:"tokenSecret,omitempty"`
}

// TokenRef names a key of TokenSecretName.
type TokenRef struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

// Token is one probe token as stored in TokenSecretName.
type Token struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

const dns1123Limit = 63

// ConfigMapName is the request ConfigMap of a runner revision, and the key of its token.
func ConfigMapName(runner string, revision int64) string {
	suffix := fmt.Sprintf("-r%d", revision)
	return truncate("devbox-probe-"+runner, dns1123Limit-len(suffix)) + suffix
}

// truncate shortens a name to limit, keeping it unique with a hash suffix.
func truncate(name string, limit int) string {
	if len(name) <= limit {
		return name
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(name))
	suffix := fmt.Sprintf("-%08x", h.Sum32())
	return name[:limit-len(suffix)] + suffix
}

// Claim formats the claim annotation.
func Claim(holder string, at time.Time) string {
	return holder + " " + at.UTC().Format(time.RFC3339)
}

// ParseClaim parses the claim annotation; ok is false for a missing or malformed claim.
func ParseClaim(v string) (holder string, at time.Time, ok bool) {
	for i := len(v) - 1; i >= 0; i-- {
		if v[i] == ' ' {
			t, err := time.Parse(time.RFC3339, v[i+1:])
			if err != nil {
				return "", time.Time{}, false
			}
			return v[:i], t, true
		}
	}
	return "", time.Time{}, false
}
