package kasapp

import (
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	tunnel2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

const (
	kasRoutingDurationMetricName      = "k8s_api_proxy_routing_duration_seconds"
	kasRoutingTimeoutMetricName       = "k8s_api_proxy_routing_timeout_total"
	kasRoutingStatusLabelName         = "status"
	kasRoutingStatusSuccessLabelValue = "success"
	kasRoutingStatusAbortedLabelValue = "aborted"

	routerTracerName = "tunnel-router"
)

type kasRouter interface {
	RegisterAgentApi(desc *grpc.ServiceDesc)
}

// router routes traffic from kas to another kas to agentk.
// routing kas -> gateway kas -> agentk
type router struct {
	kasPool          grpctool2.PoolInterface
	tunnelQuerier    tunnel2.PollingQuerier
	tunnelFinder     tunnel2.Finder
	ownPrivateApiUrl string
	pollConfig       retry.PollConfigFactory
	// internalServer is the internal gRPC server for use inside of kas.
	// Request handlers can obtain the per-request logger using grpctool.LoggerFromContext(requestContext).
	internalServer grpc.ServiceRegistrar
	// privateApiServer is the gRPC server that other kas instances can talk to.
	// Request handlers can obtain the per-request logger using grpctool.LoggerFromContext(requestContext).
	privateApiServer          grpc.ServiceRegistrar
	gatewayKasVisitor         *grpctool2.StreamVisitor
	tracer                    trace.Tracer
	kasRoutingDurationSuccess prometheus.Observer
	kasRoutingDurationAborted prometheus.Observer
	kasRoutingDurationTimeout prometheus.Counter
	tunnelFindTimeout         time.Duration
	tryNewKasInterval         time.Duration
}

func newRouter(kasPool grpctool2.PoolInterface, tunnelQuerier tunnel2.PollingQuerier,
	tunnelFinder tunnel2.Finder, ownPrivateApiUrl string,
	internalServer, privateApiServer grpc.ServiceRegistrar,
	pollConfig retry.PollConfigFactory, tp trace.TracerProvider, registerer prometheus.Registerer) (*router, error) {
	gatewayKasVisitor, err := grpctool2.NewStreamVisitor(&GatewayKasResponse{})
	if err != nil {
		return nil, err
	}
	routingDuration, timeoutCounter := constructKasRoutingMetrics()
	err = metric.Register(registerer, routingDuration, timeoutCounter)
	if err != nil {
		return nil, err
	}
	return &router{
		kasPool:                   kasPool,
		tunnelQuerier:             tunnelQuerier,
		tunnelFinder:              tunnelFinder,
		ownPrivateApiUrl:          ownPrivateApiUrl,
		pollConfig:                pollConfig,
		internalServer:            internalServer,
		privateApiServer:          privateApiServer,
		gatewayKasVisitor:         gatewayKasVisitor,
		tracer:                    tp.Tracer(routerTracerName),
		kasRoutingDurationSuccess: routingDuration.WithLabelValues(kasRoutingStatusSuccessLabelValue),
		kasRoutingDurationAborted: routingDuration.WithLabelValues(kasRoutingStatusAbortedLabelValue),
		kasRoutingDurationTimeout: timeoutCounter,
		tunnelFindTimeout:         routingTunnelFindTimeout,
		tryNewKasInterval:         routingTryNewKasInterval,
	}, nil
}

func constructKasRoutingMetrics() (*prometheus.HistogramVec, prometheus.Counter) {
	hist := prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Name:    kasRoutingDurationMetricName,
		Help:    "The time it takes the routing kas to find a suitable tunnel in seconds",
		Buckets: prometheus.ExponentialBuckets(time.Millisecond.Seconds(), 4, 8), // 8 buckets: 0.001s,0.004s,0.016s,0.064s,0.256s,1.024s,4.096s,16.384s, implicit: +Infs
	}, []string{kasRoutingStatusLabelName})
	timeoutCounter := prometheus.NewCounter(prometheus.CounterOpts{
		Name: kasRoutingTimeoutMetricName,
		Help: "The total number of times routing timed out i.e. didn't find a suitable agent connection within allocated time",
	})
	return hist, timeoutCounter
}

func (r *router) RegisterAgentApi(desc *grpc.ServiceDesc) {
	// 1. Munge the descriptor into the right shape:
	//    - turn all unary calls into streaming calls
	//    - all streaming calls, including the ones from above, are handled by routing handlers
	internalServerDesc := mungeDescriptor(desc, r.RouteToKasStreamHandler)
	privateApiServerDesc := mungeDescriptor(desc, r.RouteToAgentStreamHandler)

	// 2. Register on InternalServer gRPC server so that ReverseTunnelClient can be used in kas to send data to
	//    this API within this kas instance. This kas instance then routes the stream to the gateway kas instance.
	r.internalServer.RegisterService(internalServerDesc, nil)

	// 3. Register on PrivateApiServer gRPC server so that this kas instance can act as the gateway kas instance
	//    from above and then route to one of the matching connected agentk instances.
	r.privateApiServer.RegisterService(privateApiServerDesc, nil)
}

func mungeDescriptor(in *grpc.ServiceDesc, handler grpc.StreamHandler) *grpc.ServiceDesc {
	streams := make([]grpc.StreamDesc, 0, len(in.Streams)+len(in.Methods))
	for _, stream := range in.Streams {
		streams = append(streams, grpc.StreamDesc{
			StreamName:    stream.StreamName,
			Handler:       handler,
			ServerStreams: true,
			ClientStreams: true,
		})
	}
	// Turn all methods into streams
	for _, method := range in.Methods {
		streams = append(streams, grpc.StreamDesc{
			StreamName:    method.MethodName,
			Handler:       handler,
			ServerStreams: true,
			ClientStreams: true,
		})
	}
	return &grpc.ServiceDesc{
		ServiceName: in.ServiceName,
		Streams:     streams,
		Metadata:    in.Metadata,
	}
}

func agentIdFromMeta(md metadata.MD) (int64, error) {
	val := md.Get(modserver.RoutingAgentIdMetadataKey)
	if len(val) != 1 {
		return 0, status.Errorf(codes.InvalidArgument, "Expecting a single %s, got %d", modserver.RoutingAgentIdMetadataKey, len(val))
	}
	agentId, err := strconv.ParseInt(val[0], 10, 64)
	if err != nil {
		return 0, status.Errorf(codes.InvalidArgument, "Invalid %s", modserver.RoutingAgentIdMetadataKey)
	}
	return agentId, nil
}
