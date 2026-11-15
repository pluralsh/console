package server

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
)

const (
	// StreamTokenQueryParam carries the stream token; browsers can't set headers on WebSocket requests.
	// An `Authorization: Bearer <token>` header is accepted too.
	StreamTokenQueryParam = "token"
	// StreamInstanceQueryParam optionally names the instance the caller expects the stream to belong to.
	StreamInstanceQueryParam = "instance"
)

var proxyStreamMethod = "/" + devboxv1.Gateway_ServiceDesc.ServiceName + "/ProxyStream"

// streamsHandler proxies browser WebSockets on <prefix>/streams/<stream_id>[/<suffix>] to the gateway of the
// token's cluster as devbox.v1.Gateway/ProxyStream.
type streamsHandler struct {
	log           *zap.Logger
	api           modserver.Api
	urlPathPrefix string
	validator     *streamTokenValidator
	gatewayConn   grpc.ClientConnInterface
	tunnelQuerier tunnel.Querier
	metrics       *metrics
}

func (h *streamsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := h.log.With(logz.UrlPath(r.URL.Path))
	streamId, suffix, ok := h.parsePath(r.URL.Path)
	if !ok {
		http.NotFound(w, r)
		return
	}
	log = log.With(zap.String("stream_id", streamId))
	token := streamToken(r)
	if token == "" {
		h.reject(w, log, http.StatusUnauthorized, "missing_token", errors.New("missing stream token"))
		return
	}
	claims, err := h.validator.validate(token, streamId, r.URL.Query().Get(StreamInstanceQueryParam))
	if err != nil {
		code, reason := http.StatusUnauthorized, "invalid_token"
		switch {
		case errors.Is(err, errStreamTokenStream):
			code, reason = http.StatusForbidden, "wrong_stream"
		case errors.Is(err, errStreamTokenInstance):
			code, reason = http.StatusForbidden, "wrong_instance"
		}
		h.reject(w, log, code, reason, err)
		return
	}
	agentId, err := devbox.AgentIdForCluster(claims.ClusterId())
	if err != nil {
		h.reject(w, log, http.StatusUnauthorized, "invalid_token", err)
		return
	}
	log = log.With(zap.String("cluster_id", claims.ClusterId()), zap.String("instance_id", claims.InstanceId()),
		zap.String("kind", claims.Kind), logz.AgentId(agentId))

	ctx := r.Context()
	if h.tunnelQuerier != nil {
		urls, qErr := h.tunnelQuerier.KasUrlsByAgentId(ctx, agentId)
		if qErr == nil && len(urls) == 0 {
			h.metrics.streamRejections.WithLabelValues("cluster_offline").Inc()
			http.Error(w, "the cluster's devbox gateway is not connected", http.StatusServiceUnavailable)
			return
		}
	}

	md := metadata.Pairs(
		modserver.RoutingAgentIdMetadataKey, strconv.FormatInt(agentId, 10),
		devboxv1.ClusterIDMetadataKey, claims.ClusterId(),
		devboxv1.InstanceIDMetadataKey, claims.InstanceId(),
		devboxv1.StreamIDMetadataKey, streamId,
	)
	ctx, cancel := context.WithCancel(metadata.NewOutgoingContext(ctx, md))
	defer cancel()
	cs, err := h.gatewayConn.NewStream(ctx, &rawStreamDesc, proxyStreamMethod)
	if err != nil {
		h.api.HandleProcessingError(ctx, log, agentId, "Failed to open devbox ProxyStream", err)
		http.Error(w, "failed to reach the devbox gateway", http.StatusBadGateway)
		return
	}

	// The gateway sees the suffix as the request path and never the token.
	r.URL.Path = suffix
	r.URL.RawPath = ""
	q := r.URL.Query()
	q.Del(StreamTokenQueryParam)
	r.URL.RawQuery = q.Encode()
	r.Header.Del(httpz.AuthorizationHeader)

	h.metrics.streams.Inc()
	defer h.metrics.streams.Dec()
	log.Debug("Proxying devbox stream")
	http2grpc := grpctool.InboundHttpToOutboundGrpc{
		Log: log,
		HandleProcessingError: func(msg string, err error) {
			h.api.HandleProcessingError(ctx, log, agentId, msg, err)
		},
		WriteErrorResponse: writeStreamErrorResponse,
		MergeHeaders:       mergeStreamHeaders,
	}
	http2grpc.Pipe(&grpc.GenericClientStream[grpctool.HttpRequest, grpctool.HttpResponse]{ClientStream: cs}, w, r, nil)
}

// parsePath accepts the path with or without the listener's url_path_prefix, since an ingress may strip it.
func (h *streamsHandler) parsePath(p string) (string /* streamId */, string /* suffix */, bool) {
	p = strings.TrimPrefix(p, h.urlPathPrefix)
	rest, ok := strings.CutPrefix(p, devbox.StreamsPathSegment)
	if !ok {
		return "", "", false
	}
	streamId, suffix, _ := strings.Cut(rest, "/")
	if streamId == "" {
		return "", "", false
	}
	return streamId, "/" + suffix, true
}

func (h *streamsHandler) reject(w http.ResponseWriter, log *zap.Logger, code int, reason string, err error) {
	h.metrics.streamRejections.WithLabelValues(reason).Inc()
	log.Debug("Devbox stream rejected", zap.String("reason", reason), logz.Error(err))
	http.Error(w, http.StatusText(code), code)
}

func streamToken(r *http.Request) string {
	if t := r.URL.Query().Get(StreamTokenQueryParam); t != "" {
		return t
	}
	if t, ok := strings.CutPrefix(r.Header.Get(httpz.AuthorizationHeader), "Bearer "); ok {
		return strings.TrimSpace(t)
	}
	return ""
}

func writeStreamErrorResponse(w http.ResponseWriter, _ *http.Request, eResp *grpctool.ErrResp) {
	code := int(eResp.StatusCode)
	if eResp.Err != nil && status.Code(eResp.Err) == codes.Unavailable {
		code = http.StatusServiceUnavailable
	}
	http.Error(w, eResp.Msg, code)
}

func mergeStreamHeaders(outbound, inbound http.Header) {
	for k, v := range outbound {
		inbound[k] = v
	}
}
