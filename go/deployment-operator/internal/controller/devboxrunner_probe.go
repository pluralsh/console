package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/samber/lo"
	"google.golang.org/protobuf/encoding/protojson"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
)

// Agent probe handoff between the operator and the devbox gateway; the contract is documented in pkg/devbox/probe.
// The operator writes the request ConfigMap and the probe token, minted with console's mintDevboxProbeToken. It
// fails the revision if any declared agent is MISSING, or the probe failed or timed out, so the previous revision
// keeps serving. An agent whose probe is FAILED is surfaced as an AgentProbe warning. The result of the serving
// revision is kept as the agent catalog upserted to console, and deleted with the revision.
const (
	DevboxProbeLabel           = probe.Label
	DevboxProbeLabelRequest    = probe.LabelRequest
	DevboxProbeRevisionLabel   = probe.RevisionLabel
	DevboxProbeStateAnnotation = probe.StateAnnotation
	DevboxProbeStateDone       = probe.StateDone
	DevboxProbeStateFailed     = probe.StateFailed
	DevboxProbeRequestKey      = probe.RequestKey
	DevboxProbeResultKey       = probe.ResultKey
	DevboxProbeErrorKey        = probe.ErrorKey
	DevboxProbeTokenSecretName = probe.TokenSecretName

	defaultProbeTimeout = 30 * time.Minute
	// probeTokenMinValidity re-mints a pending request's token when less than this is left.
	probeTokenMinValidity = 10 * time.Minute
)

type DevboxProbeRequest struct {
	probe.Request `json:",inline"`
	// Agents are the declared agents; Probe carries the same as a ProbeAgentsRequest.
	Agents []guest.Agent `json:"agents"`
}

// DevboxProbeTokenMinter mints the box-scoped AI proxy token the probe runs with (console's mintDevboxProbeToken).
type DevboxProbeTokenMinter interface {
	MintDevboxProbeToken(ctx context.Context, devboxID string) (probe.Token, error)
}

type DevboxProbeResult struct {
	Response *devboxv1.ProbeAgentsResponse
	// Error is set when the probe could not run at all.
	Error string
}

// DevboxProbeClient hands a golden tag to whoever runs the agent probe and collects the result.
type DevboxProbeClient interface {
	// Request creates the probe request for a revision if it doesn't exist yet.
	Request(ctx context.Context, req DevboxProbeRequest) error
	// Result returns nil until the probe finished.
	Result(ctx context.Context, runner string, revision int64) (*DevboxProbeResult, error)
	// ReleaseToken drops the probe token of a finished revision, keeping its result.
	ReleaseToken(ctx context.Context, runner string, revision int64) error
	// Cleanup deletes the request, token and result of a revision.
	Cleanup(ctx context.Context, runner string, revision int64) error
}

// ConfigMapProbeClient implements the pkg/devbox/probe contract.
type ConfigMapProbeClient struct {
	Client client.Client
	// Reader reads probe ConfigMaps and the token Secret, normally the manager's uncached API reader.
	Reader    client.Reader
	Namespace string
	Timeout   time.Duration
	// Tokens mints probe tokens. Without it requests carry no token and the probe runs unauthenticated.
	Tokens DevboxProbeTokenMinter
	// Now is overridable in tests.
	Now func() time.Time
}

var _ DevboxProbeClient = &ConfigMapProbeClient{}

func DevboxProbeConfigMapName(runner string, revision int64) string {
	return probe.ConfigMapName(runner, revision)
}

func (c *ConfigMapProbeClient) reader() client.Reader {
	if c.Reader == nil {
		return c.Client
	}
	return c.Reader
}

func (c *ConfigMapProbeClient) now() time.Time {
	if c.Now == nil {
		return time.Now()
	}
	return c.Now()
}

// Request writes the probe token, then the request ConfigMap if it doesn't exist yet. While the request is pending
// it keeps the token valid, so a gateway that picks the request up late still gets a usable one.
func (c *ConfigMapProbeClient) Request(ctx context.Context, req DevboxProbeRequest) error {
	name := DevboxProbeConfigMapName(req.Runner, req.Revision)
	existing := &corev1.ConfigMap{}
	err := c.reader().Get(ctx, client.ObjectKey{Name: name, Namespace: c.Namespace}, existing)
	switch {
	case err == nil:
		if existing.Annotations[DevboxProbeStateAnnotation] != "" {
			return nil
		}
		return c.ensureToken(ctx, name, req.DevboxID)
	case !apierrors.IsNotFound(err):
		return fmt.Errorf("getting probe request %s: %w", name, err)
	}

	if err := c.ensureToken(ctx, name, req.DevboxID); err != nil {
		return err
	}
	if c.Tokens != nil {
		req.TokenSecret = &probe.TokenRef{Name: DevboxProbeTokenSecretName, Key: name}
	}
	spec, err := protojson.Marshal(&devboxv1.ProbeAgentsRequest{Agents: devboxProbeSpecs(req.Agents)})
	if err != nil {
		return err
	}
	req.Probe = spec
	data, err := json.Marshal(req)
	if err != nil {
		return err
	}

	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: c.Namespace,
			Labels: map[string]string{
				DevboxProbeLabel:               DevboxProbeLabelRequest,
				v1alpha1.DevboxRunnerNameLabel: req.Runner,
				DevboxProbeRevisionLabel:       strconv.FormatInt(req.Revision, 10),
			},
		},
		Data: map[string]string{DevboxProbeRequestKey: string(data)},
	}
	if err := c.Client.Create(ctx, cm); err != nil && !apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("creating probe request %s: %w", cm.Name, err)
	}
	return nil
}

// ensureToken mints a probe token into the token Secret under key unless a valid one is there.
func (c *ConfigMapProbeClient) ensureToken(ctx context.Context, key, devboxID string) error {
	if c.Tokens == nil {
		return nil
	}
	if devboxID == "" {
		return fmt.Errorf("cannot mint a probe token before the Devbox is registered in console")
	}
	secret := &corev1.Secret{}
	err := c.reader().Get(ctx, client.ObjectKey{Name: DevboxProbeTokenSecretName, Namespace: c.Namespace}, secret)
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("getting probe token Secret: %w", err)
	}
	if raw, ok := secret.Data[key]; ok {
		var tok probe.Token
		if json.Unmarshal(raw, &tok) == nil && tok.Token != "" && tok.ExpiresAt.Sub(c.now()) > probeTokenMinValidity {
			return nil
		}
	}

	tok, err := c.Tokens.MintDevboxProbeToken(ctx, devboxID)
	if err != nil {
		return fmt.Errorf("minting probe token: %w", err)
	}
	raw, err := json.Marshal(tok)
	if err != nil {
		return err
	}
	return c.patchTokens(ctx, func(data map[string][]byte) { data[key] = raw })
}

// patchTokens applies change to the token Secret, creating it if needed.
func (c *ConfigMapProbeClient) patchTokens(ctx context.Context, change func(map[string][]byte)) error {
	secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: DevboxProbeTokenSecretName, Namespace: c.Namespace}}
	_, err := controllerutil.CreateOrPatch(ctx, c.Client, secret, func() error {
		secret.Labels = lo.Assign(secret.Labels, devboxGatewayLabels())
		secret.Type = corev1.SecretTypeOpaque
		if secret.Data == nil {
			secret.Data = map[string][]byte{}
		}
		change(secret.Data)
		return nil
	})
	if err != nil {
		return fmt.Errorf("updating probe token Secret: %w", err)
	}
	return nil
}

func (c *ConfigMapProbeClient) Result(ctx context.Context, runner string, revision int64) (*DevboxProbeResult, error) {
	reader := c.reader()
	cm := &corev1.ConfigMap{}
	if err := reader.Get(ctx, client.ObjectKey{Name: DevboxProbeConfigMapName(runner, revision), Namespace: c.Namespace}, cm); err != nil {
		return nil, client.IgnoreNotFound(err)
	}

	switch cm.Annotations[DevboxProbeStateAnnotation] {
	case DevboxProbeStateDone:
		res := &devboxv1.ProbeAgentsResponse{}
		if err := (protojson.UnmarshalOptions{DiscardUnknown: true}).Unmarshal([]byte(cm.Data[DevboxProbeResultKey]), res); err != nil {
			return &DevboxProbeResult{Error: fmt.Sprintf("unreadable probe result: %s", err)}, nil
		}
		return &DevboxProbeResult{Response: res}, nil
	case DevboxProbeStateFailed:
		return &DevboxProbeResult{Error: lo.CoalesceOrEmpty(cm.Data[DevboxProbeErrorKey], "the gateway could not run the agent probe")}, nil
	}

	timeout := c.Timeout
	if timeout == 0 {
		timeout = defaultProbeTimeout
	}
	if time.Since(cm.CreationTimestamp.Time) > timeout {
		return &DevboxProbeResult{Error: fmt.Sprintf("no probe result after %s; is the devbox gateway running?", timeout)}, nil
	}
	return nil, nil
}

func (c *ConfigMapProbeClient) Cleanup(ctx context.Context, runner string, revision int64) error {
	if err := c.ReleaseToken(ctx, runner, revision); err != nil {
		return err
	}
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: DevboxProbeConfigMapName(runner, revision), Namespace: c.Namespace}}
	return client.IgnoreNotFound(c.Client.Delete(ctx, cm))
}

// ReleaseToken drops a revision's probe token once its probe finished.
func (c *ConfigMapProbeClient) ReleaseToken(ctx context.Context, runner string, revision int64) error {
	key := DevboxProbeConfigMapName(runner, revision)
	secret := &corev1.Secret{}
	if err := c.reader().Get(ctx, client.ObjectKey{Name: DevboxProbeTokenSecretName, Namespace: c.Namespace}, secret); err != nil {
		return client.IgnoreNotFound(err)
	}
	if _, ok := secret.Data[key]; !ok {
		return nil
	}
	return c.patchTokens(ctx, func(data map[string][]byte) { delete(data, key) })
}

func devboxProbeSpecs(agents []guest.Agent) []*devboxv1.AgentProbeSpec {
	return lo.Map(agents, func(a guest.Agent, _ int) *devboxv1.AgentProbeSpec {
		return &devboxv1.AgentProbeSpec{
			Type:           devboxProtoAgentType(v1alpha1.DevboxAgentType(a.Type)),
			IsDefault:      a.Default,
			AdapterVersion: a.AdapterVersion,
			Models:         a.Models,
			DefaultModel:   a.DefaultModel,
			AcpV2:          a.ACPV2,
		}
	})
}

func devboxProtoAgentType(t v1alpha1.DevboxAgentType) devboxv1.AgentType {
	if v, ok := devboxv1.AgentType_value["AGENT_TYPE_"+strings.ToUpper(string(t))]; ok {
		return devboxv1.AgentType(v)
	}
	return devboxv1.AgentType_AGENT_TYPE_UNSPECIFIED
}

func devboxAgentTypeFromProto(t devboxv1.AgentType) v1alpha1.DevboxAgentType {
	return v1alpha1.DevboxAgentType(strings.ToLower(strings.TrimPrefix(t.String(), "AGENT_TYPE_")))
}

// probeStatusName maps the proto enum to console's devbox_probe_status values (ok, failed, missing).
func probeStatusName(s devboxv1.ProbeStatus) string {
	return strings.TrimPrefix(s.String(), "PROBE_STATUS_")
}

type DevboxProbeEvaluation struct {
	Violations []string
	Warnings   []string
}

func (e DevboxProbeEvaluation) OK() bool { return len(e.Violations) == 0 }

func (e DevboxProbeEvaluation) Message() string { return strings.Join(e.Violations, "; ") }

// EvaluateDevboxProbe checks the probe result against the declared agents.
func EvaluateDevboxProbe(runner *v1alpha1.DevboxRunner, result *DevboxProbeResult) DevboxProbeEvaluation {
	var eval DevboxProbeEvaluation
	if result.Error != "" {
		eval.Violations = append(eval.Violations, "agent probe failed: "+result.Error)
		return eval
	}

	byType := map[v1alpha1.DevboxAgentType]*devboxv1.AgentCatalogEntry{}
	for _, entry := range result.Response.GetAgents() {
		byType[devboxAgentTypeFromProto(entry.GetType())] = entry
	}
	for _, agent := range runner.Spec.Agents {
		entry, ok := byType[agent.Type]
		switch {
		case !ok || entry.GetProbeStatus() == devboxv1.ProbeStatus_PROBE_STATUS_MISSING:
			eval.Violations = append(eval.Violations, fmt.Sprintf("agent %s is not installed in the image", agent.Type))
		case entry.GetProbeStatus() == devboxv1.ProbeStatus_PROBE_STATUS_FAILED:
			eval.Warnings = append(eval.Warnings, fmt.Sprintf("agent %s probe failed: %s", agent.Type, entry.GetProbeError()))
		}
	}
	return eval
}

// devboxAgentStatuses summarizes a probe result for status.agents.
func devboxAgentStatuses(result *DevboxProbeResult) []v1alpha1.DevboxAgentStatus {
	if result == nil || result.Response == nil {
		return nil
	}
	return lo.Map(result.Response.GetAgents(), func(e *devboxv1.AgentCatalogEntry, _ int) v1alpha1.DevboxAgentStatus {
		return v1alpha1.DevboxAgentStatus{
			Type:           devboxAgentTypeFromProto(e.GetType()),
			ProbeStatus:    probeStatusName(e.GetProbeStatus()),
			AdapterVersion: lo.EmptyableToPtr(e.GetAdapterVersion()),
			ProbeError:     lo.EmptyableToPtr(e.GetProbeError()),
		}
	})
}
