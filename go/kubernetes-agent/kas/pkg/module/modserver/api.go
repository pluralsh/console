package modserver

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/rueidis"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"github.com/pluralsh/kubernetes-agent/pkg/event"
	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	"github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/syncz"
)

const (
	// RoutingHopPrefix is a metadata key prefix that is used for metadata keys that should be consumed by
	// the gateway kas instances and not passed along to agentk.
	RoutingHopPrefix = "kas-hop-"
	// RoutingAgentIdMetadataKey is used to pass destination agent id in request metadata
	// from the routing kas instance, that is handling the incoming request, to the gateway kas instance,
	// that is forwarding the request to an agentk.
	RoutingAgentIdMetadataKey = RoutingHopPrefix + "routing-agent-id"

	// SentryFieldTraceId is the name of the Sentry field for trace ID.
	SentryFieldTraceId      = "trace_id"
	SentryFieldTraceSampled = "trace_sampled"
	GrpcServiceSentryField  = "grpc.service"
	GrpcMethodSentryField   = "grpc.method"
)

// ApplyDefaults is a signature of a public function, exposed by modules to perform defaulting.
// The function should be called ApplyDefaults.
type ApplyDefaults func(*kascfg.ConfigurationFile)

// Config holds configuration for a Module.
type Config struct {
	// Log can be used for logging from the module.
	// It should not be used for logging from gRPC Api methods. Use grpctool.LoggerFromContext(ctx) instead.
	Log    *zap.Logger
	Api    Api
	Config *kascfg.ConfigurationFile
	// Registerer allows to register metrics.
	// Metrics should be registered in Run and unregistered before Run returns.
	Registerer   prometheus.Registerer
	UsageTracker usage_metrics.UsageTrackerRegisterer
	// AgentServer is the gRPC server agentk is talking to.
	// This can be used to add endpoints in Factory.New.
	// Request handlers can obtain the per-request logger using grpctool.LoggerFromContext(requestContext).
	AgentServer *grpc.Server
	// ApiServer is the gRPC server Plural is talking to.
	// This can be used to add endpoints in Factory.New.
	// Request handlers can obtain the per-request logger using grpctool.LoggerFromContext(requestContext).
	ApiServer *grpc.Server
	// RegisterAgentApi allows to register a gRPC Api endpoint that kas proxies to agentk.
	RegisterAgentApi func(*grpc.ServiceDesc)
	// AgentConn is a gRPC connection that can be used to send requests to an agentk instance.
	// Agent Id must be specified in the request metadata in RoutingAgentIdMetadataKey field.
	// Make sure factory returns modshared.ModuleStartAfterServers if module uses this connection.
	AgentConn       grpc.ClientConnInterface
	TraceProvider   trace.TracerProvider
	TracePropagator propagation.TextMapPropagator
	MeterProvider   metric.MeterProvider
	RedisClient     rueidis.Client
	// KasName is a string "gitlab-kas". Can be used as a user agent, server name, service name, etc.
	KasName string
	// Version is gitlab-kas version.
	Version string
	// CommitId is gitlab-kas commit sha.
	CommitId string
	// ProbeRegistry is for registering liveness probes and readiness probes
	ProbeRegistry *observability.ProbeRegistry
}

// Api provides the API for the module to use.
type Api interface {
	modshared.Api
	// OnGitPushEvent runs the given callback function for a received Git push event.
	// The Git push event may come from any Plural project and as such it's up to the
	// callback to filter out the events that it's interested in.
	// The callback MUST NOT block i.e. perform I/O or acquire contended locks. Perform those operations
	// asynchronously in a separate goroutine when required.
	OnGitPushEvent(ctx context.Context, cb syncz.EventCallback[*event.GitPushEvent])
}

type Factory interface {
	modshared.Factory
	// New creates a new instance of a Module.
	New(*Config) (Module, error)
}

type Module interface {
	// Run starts the module.
	// Run can block until the context is canceled or exit with nil if there is nothing to do.
	Run(context.Context) error
	// Name returns module's name.
	Name() string
}
