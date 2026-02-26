package server

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	gitlab2 "github.com/pluralsh/kubernetes-agent/pkg/gitlab"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics"
	pluralapi "github.com/pluralsh/kubernetes-agent/pkg/plural/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	httpz2 "github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/memz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/uuid"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apiserver/pkg/endpoints/handlers/negotiation"
)

const (
	readHeaderTimeout = 10 * time.Second
	idleTimeout       = 1 * time.Minute

	authorizationHeaderBearerPrefix = "Bearer " // must end with a space
	tokenSeparator                  = ":"
	tokenTypePlural                 = "plrl"
)

var (
	code2reason = map[int32]metav1.StatusReason{
		// 4xx
		http.StatusBadRequest:            metav1.StatusReasonBadRequest,
		http.StatusUnauthorized:          metav1.StatusReasonUnauthorized,
		http.StatusForbidden:             metav1.StatusReasonForbidden,
		http.StatusNotFound:              metav1.StatusReasonNotFound,
		http.StatusMethodNotAllowed:      metav1.StatusReasonMethodNotAllowed,
		http.StatusNotAcceptable:         metav1.StatusReasonNotAcceptable,
		http.StatusConflict:              metav1.StatusReasonConflict,
		http.StatusGone:                  metav1.StatusReasonGone,
		http.StatusRequestEntityTooLarge: metav1.StatusReasonRequestEntityTooLarge,
		http.StatusUnsupportedMediaType:  metav1.StatusReasonUnsupportedMediaType,
		http.StatusUnprocessableEntity:   metav1.StatusReasonInvalid,
		http.StatusTooManyRequests:       metav1.StatusReasonTooManyRequests,

		// 5xx
		http.StatusInternalServerError: metav1.StatusReasonInternalError,
		http.StatusServiceUnavailable:  metav1.StatusReasonServiceUnavailable,
		http.StatusGatewayTimeout:      metav1.StatusReasonTimeout,
	}
)

type proxyUserCacheKey struct {
	agentId   int64
	accessKey string
	clusterId string
}

type kubernetesApiProxy struct {
	log                      *zap.Logger
	api                      modserver.Api
	kubernetesApiClient      rpc2.KubernetesApiClient
	pluralUrl                string
	allowedOriginUrls        []string
	allowedAgentsCache       *cache.CacheWithErr[string, *pluralapi.AllowedAgentsForJob]
	authorizeProxyUserCache  *cache.CacheWithErr[proxyUserCacheKey, *pluralapi.AuthorizeProxyUserResponse]
	requestCounter           usage_metrics.Counter
	ciTunnelUsersCounter     usage_metrics.UniqueCounter
	ciAccessRequestCounter   usage_metrics.Counter
	ciAccessUsersCounter     usage_metrics.UniqueCounter
	ciAccessAgentsCounter    usage_metrics.UniqueCounter
	userAccessRequestCounter usage_metrics.Counter
	userAccessUsersCounter   usage_metrics.UniqueCounter
	userAccessAgentsCounter  usage_metrics.UniqueCounter
	patAccessRequestCounter  usage_metrics.Counter
	patAccessUsersCounter    usage_metrics.UniqueCounter
	patAccessAgentsCounter   usage_metrics.UniqueCounter
	responseSerializer       runtime.NegotiatedSerializer
	traceProvider            trace.TracerProvider
	tracePropagator          propagation.TextMapPropagator
	meterProvider            metric.MeterProvider
	serverName               string
	serverVia                string
	// urlPathPrefix is guaranteed to end with / by defaulting.
	urlPathPrefix       string
	listenerGracePeriod time.Duration
	shutdownGracePeriod time.Duration
}

func (p *kubernetesApiProxy) Run(ctx context.Context, listener net.Listener) error {
	var handler http.Handler
	handler = http.HandlerFunc(p.proxy)
	handler = otelhttp.NewHandler(handler, "k8s-proxy",
		otelhttp.WithTracerProvider(p.traceProvider),
		otelhttp.WithPropagators(p.tracePropagator),
		otelhttp.WithMeterProvider(p.meterProvider),
		otelhttp.WithPublicEndpoint(),
	)
	srv := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleTimeout,
	}
	return httpz2.RunServer(ctx, srv, listener, p.listenerGracePeriod, p.shutdownGracePeriod)
}

// proxy Kubernetes API calls via agentk to the cluster Kube API.
//
// This method also takes care of CORS preflight requests as documented [here](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request).
func (p *kubernetesApiProxy) proxy(w http.ResponseWriter, r *http.Request) {
	// for preflight and normal requests we want to allow some configured allowed origins and
	// support exposing the response to the client when credentials (e.g. cookies) are included in the request
	header := w.Header()

	requestedOrigin := r.Header.Get(httpz2.OriginHeader)
	if requestedOrigin != "" {
		// If the Origin header is set, it needs to match the configured allowed origin urls.
		if !p.isOriginAllowed(requestedOrigin) {
			// Reject the request because origin is not allowed
			p.log.Sugar().Debugf("Received Origin %q is not in configured allowed origins", requestedOrigin)
			w.WriteHeader(http.StatusForbidden)
			return
		}
		header[httpz2.AccessControlAllowOriginHeader] = []string{requestedOrigin}
		header[httpz2.AccessControlAllowCredentialsHeader] = []string{"true"}
		header[httpz2.VaryHeader] = []string{httpz2.OriginHeader}
	}
	header[httpz2.ServerHeader] = []string{p.serverName} // It will be removed just before responding with actual headers from upstream

	if r.Method == http.MethodOptions {
		// we have a preflight request
		header[httpz2.AccessControlAllowHeadersHeader] = r.Header[httpz2.AccessControlRequestHeadersHeader]
		// all allowed HTTP methods:
		// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
		header[httpz2.AccessControlAllowMethodsHeader] = []string{"GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH"}
		header[httpz2.AccessControlMaxAgeHeader] = []string{"86400"}
		w.WriteHeader(http.StatusOK)
	} else {
		log, agentId, eResp := p.proxyInternal(w, r)
		if eResp != nil {
			p.writeErrorResponse(log, agentId)(w, r, eResp)
		}
	}
}

func (p *kubernetesApiProxy) isOriginAllowed(origin string) bool {
	for _, v := range p.allowedOriginUrls {
		if v == origin {
			return true
		}
	}
	return false
}

func (p *kubernetesApiProxy) proxyInternal(w http.ResponseWriter, r *http.Request) (*zap.Logger, int64 /* agentId */, *grpctool.ErrResp) {
	ctx := r.Context()
	log := p.log.With(logz.TraceIdFromContext(ctx))

	if !strings.HasPrefix(r.URL.Path, p.urlPathPrefix) {
		msg := "Bad request: URL does not start with expected prefix"
		log.Debug(msg, logz.UrlPath(r.URL.Path), logz.UrlPathPrefix(p.urlPathPrefix))
		return log, modshared.NoAgentId, &grpctool.ErrResp{
			StatusCode: http.StatusBadRequest,
			Msg:        msg,
		}
	}

	log, clusterId, impConfig, eResp := p.authenticateAndImpersonateRequest(ctx, log, r)
	if eResp != nil {
		// If Plural doesn't authorize the proxy user to make the call,
		// we send an extra header to indicate that, so that the client
		// can differentiate from an *unauthorized* response from Plural
		// and from an *authorized* response from the proxied K8s cluster.
		if eResp.StatusCode == http.StatusUnauthorized {
			w.Header()[httpz2.GitlabUnauthorizedHeader] = []string{"true"}
		}
		return log, clusterId, eResp
	}

	p.requestCounter.Inc() // Count only authenticated and authorized requests

	md := metadata.Pairs(modserver.RoutingAgentIdMetadataKey, strconv.FormatInt(clusterId, 10))
	mkClient, err := p.kubernetesApiClient.MakeRequest(metadata.NewOutgoingContext(ctx, md))
	if err != nil {
		msg := "Proxy failed to make outbound request"
		p.api.HandleProcessingError(ctx, log, clusterId, msg, err)
		return log, clusterId, &grpctool.ErrResp{
			StatusCode: http.StatusInternalServerError,
			Msg:        msg,
			Err:        err,
		}
	}

	p.pipeStreams(log, clusterId, w, r, mkClient, impConfig) // nolint: contextcheck
	return log, clusterId, nil
}

func (p *kubernetesApiProxy) authenticateAndImpersonateRequest(ctx context.Context, log *zap.Logger, r *http.Request) (*zap.Logger, int64 /* agentId */, *rpc2.ImpersonationConfig, *grpctool.ErrResp) {
	agentId, creds, err := getAuthorizationInfoFromRequest(r)
	if err != nil {
		msg := "Unauthorized"
		log.Debug(msg, logz.Error(err))
		return log, modshared.NoAgentId, nil, &grpctool.ErrResp{
			StatusCode: http.StatusUnauthorized,
			Msg:        msg,
			Err:        err,
		}
	}
	log = log.With(logz.AgentId(agentId))
	trace.SpanFromContext(ctx).SetAttributes(api.TraceAgentIdAttr.Int64(agentId))

	var (
		impConfig *rpc2.ImpersonationConfig // can be nil
	)

	switch c := creds.(type) {
	case patAuthn:
		pluralapi.CreateAuditLogInBackground(log, agentId, r, c.token, c.clusterId, p.pluralUrl)
		auth, eResp := p.authorizeProxyUser(ctx, log, agentId, c.token, c.clusterId)
		if eResp != nil {
			return log, agentId, nil, eResp
		}
		impConfig, err = constructUserImpersonationConfig(auth)
		if err != nil {
			msg := "Failed to construct user impersonation config"
			p.api.HandleProcessingError(ctx, log, agentId, msg, err)
			return log, agentId, nil, &grpctool.ErrResp{
				StatusCode: http.StatusInternalServerError,
				Msg:        msg,
				Err:        err,
			}
		}
		// update usage metrics for PAT requests using the CI tunnel
		p.patAccessRequestCounter.Inc()
		// p.patAccessUsersCounter.Add(userId)
		p.patAccessAgentsCounter.Add(agentId)
	default: // This should never happen
		msg := "Invalid authorization type"
		p.api.HandleProcessingError(ctx, log, agentId, msg, err)
		return log, agentId, nil, &grpctool.ErrResp{
			StatusCode: http.StatusInternalServerError,
			Msg:        msg,
		}
	}
	return log, agentId, impConfig, nil
}

func (p *kubernetesApiProxy) authorizeProxyUser(ctx context.Context, log *zap.Logger, agentId int64, accessKey, clusterId string) (*pluralapi.AuthorizeProxyUserResponse, *grpctool.ErrResp) {
	key := proxyUserCacheKey{
		agentId:   agentId,
		clusterId: clusterId,
		accessKey: accessKey,
	}
	auth, err := p.authorizeProxyUserCache.GetItem(ctx, key, func() (*pluralapi.AuthorizeProxyUserResponse, error) {
		return pluralapi.AuthorizeProxyUser(ctx, accessKey, clusterId, p.pluralUrl)
	})
	if err != nil {
		switch {
		case gitlab2.IsUnauthorized(err), gitlab2.IsForbidden(err), gitlab2.IsNotFound(err):
			log.Debug("Authorize proxy user error", logz.Error(err))
			return nil, &grpctool.ErrResp{
				StatusCode: http.StatusUnauthorized,
				Msg:        "Unauthorized",
			}
		default:
			msg := "Failed to authorize user session"
			p.api.HandleProcessingError(ctx, log, agentId, msg, err)
			return nil, &grpctool.ErrResp{
				StatusCode: http.StatusInternalServerError,
				Msg:        msg,
			}
		}
	}
	return auth, nil
}

func (p *kubernetesApiProxy) pipeStreams(log *zap.Logger, agentId int64, w http.ResponseWriter, r *http.Request,
	client rpc2.KubernetesApi_MakeRequestClient, impConfig *rpc2.ImpersonationConfig) {
	// urlPathPrefix is guaranteed to end with / by defaulting. That means / will be removed here.
	// Put it back by -1 on length.
	r.URL.Path = r.URL.Path[len(p.urlPathPrefix)-1:]

	// remove Plural authorization headers (job token, session cookie etc)
	delete(r.Header, httpz2.AuthorizationHeader)
	delete(r.Header, httpz2.CookieHeader)
	delete(r.Header, httpz2.GitlabAgentIdHeader)
	delete(r.Header, httpz2.CsrfTokenHeader)
	// remove Plural authorization query parameters
	query := r.URL.Query()
	delete(query, httpz2.GitlabAgentIdQueryParam)
	delete(query, httpz2.CsrfTokenQueryParam)
	r.URL.RawQuery = query.Encode()

	r.Header[httpz2.ViaHeader] = append(r.Header[httpz2.ViaHeader], p.serverVia)

	http2grpc := grpctool.InboundHttpToOutboundGrpc{
		Log: log,
		HandleProcessingError: func(msg string, err error) {
			p.api.HandleProcessingError(r.Context(), log, agentId, msg, err)
		},
		WriteErrorResponse: p.writeErrorResponse(log, agentId),
		MergeHeaders:       p.mergeProxiedResponseHeaders,
	}
	var extra proto.Message // don't use a concrete type here or extra will be passed as a typed nil.
	if impConfig != nil {
		extra = &rpc2.HeaderExtra{
			ImpConfig: impConfig,
		}
	}
	http2grpc.Pipe(client, w, r, extra)
}

func (p *kubernetesApiProxy) mergeProxiedResponseHeaders(outbound, inbound http.Header) {
	delete(inbound, httpz2.ServerHeader) // remove the header we've added above. We use Via instead.
	// remove all potential CORS headers from the proxied response
	delete(outbound, httpz2.AccessControlAllowOriginHeader)
	delete(outbound, httpz2.AccessControlAllowHeadersHeader)
	delete(outbound, httpz2.AccessControlAllowCredentialsHeader)
	delete(outbound, httpz2.AccessControlAllowMethodsHeader)
	delete(outbound, httpz2.AccessControlMaxAgeHeader)

	// set headers from proxied response without overwriting the ones already set (e.g. CORS headers)
	for k, vals := range outbound {
		if len(inbound[k]) == 0 {
			inbound[k] = vals
		}
	}
	// explicitly merge Vary header with the headers from proxies requests.
	// We always set the Vary header to `Origin` for CORS
	if v := append(inbound[httpz2.VaryHeader], outbound[httpz2.VaryHeader]...); len(v) > 0 { //nolint:gocritic
		inbound[httpz2.VaryHeader] = v
	}
	inbound[httpz2.ViaHeader] = append(inbound[httpz2.ViaHeader], p.serverVia)
}

func (p *kubernetesApiProxy) writeErrorResponse(log *zap.Logger, agentId int64) grpctool.WriteErrorResponse {
	return func(w http.ResponseWriter, r *http.Request, errResp *grpctool.ErrResp) {
		_, info, err := negotiation.NegotiateOutputMediaType(r, p.responseSerializer, negotiation.DefaultEndpointRestrictions)
		ctx := r.Context()
		if err != nil {
			msg := "Failed to negotiate output media type"
			log.Debug(msg, logz.Error(err))
			http.Error(w, formatStatusMessage(ctx, msg, err), http.StatusNotAcceptable)
			return
		}
		message := formatStatusMessage(ctx, errResp.Msg, errResp.Err)
		s := &metav1.Status{
			TypeMeta: metav1.TypeMeta{
				Kind:       "Status",
				APIVersion: "v1",
			},
			Status:  metav1.StatusFailure,
			Message: message,
			Reason:  code2reason[errResp.StatusCode], // if mapping is not present, then "" means metav1.StatusReasonUnknown
			Code:    errResp.StatusCode,
		}
		buf := memz.Get32k() // use a temporary buffer to segregate I/O errors and encoding errors
		defer memz.Put32k(buf)
		buf = buf[:0] // don't care what's in the buf, start writing from the start
		b := bytes.NewBuffer(buf)
		err = info.Serializer.Encode(s, b) // encoding errors
		if err != nil {
			p.api.HandleProcessingError(ctx, log, agentId, "Failed to encode status response", err)
			http.Error(w, message, int(errResp.StatusCode))
			return
		}
		w.Header()[httpz2.ContentTypeHeader] = []string{info.MediaType}
		w.WriteHeader(int(errResp.StatusCode))
		_, _ = w.Write(b.Bytes()) // I/O errors
	}
}

// err can be nil.
func formatStatusMessage(ctx context.Context, msg string, err error) string {
	var b strings.Builder
	b.WriteString("Plural Agent Server: ")
	b.WriteString(msg)
	if err != nil {
		b.WriteString(": ")
		b.WriteString(err.Error())
	}
	traceId := trace.SpanContextFromContext(ctx).TraceID()
	if traceId.IsValid() {
		b.WriteString(". Trace ID: ")
		b.WriteString(traceId.String())
	}
	return b.String()
}

type patAuthn struct {
	token     string
	clusterId string
}

func getAuthorizationInfoFromRequest(r *http.Request) (int64 /* agentId */, any, error) {
	if authzHeader := r.Header[httpz2.AuthorizationHeader]; len(authzHeader) >= 1 {
		if len(authzHeader) > 1 {
			return 0, nil, fmt.Errorf("%s header: expecting a single header, got %d", httpz2.AuthorizationHeader, len(authzHeader))
		}
		agentId, tokenType, token, clusterId, err := getAgentIdAndTokenFromHeader(authzHeader[0])
		if err != nil {
			return 0, nil, err
		}
		if tokenType == tokenTypePlural {
			return agentId, patAuthn{
				token:     token,
				clusterId: clusterId,
			}, nil
		}
	}
	return 0, nil, errors.New("no valid credentials provided")
}

func getAgentIdAndTokenFromHeader(header string) (int64, string /* token type */, string /* token */, string /* clusterId */, error) {
	if !strings.HasPrefix(header, authorizationHeaderBearerPrefix) {
		// "missing" space in message - it's in the authorizationHeaderBearerPrefix constant already
		return 0, "", "", "", fmt.Errorf("%s header: expecting %stoken", httpz2.AuthorizationHeader, authorizationHeaderBearerPrefix)
	}
	tokenValue := header[len(authorizationHeaderBearerPrefix):]
	tokenType, tokenContents, found := strings.Cut(tokenValue, tokenSeparator)
	if !found {
		return 0, "", "", "", fmt.Errorf("%s header: invalid value", httpz2.AuthorizationHeader)
	}
	switch tokenType {
	case tokenTypePlural:
	default:
		return 0, "", "", "", fmt.Errorf("%s header: unknown token type", httpz2.AuthorizationHeader)
	}
	agentIdAndToken := tokenContents
	clusterIdStr, token, found := strings.Cut(agentIdAndToken, tokenSeparator)
	if !found {
		return 0, "", "", "", fmt.Errorf("%s header: invalid value", httpz2.AuthorizationHeader)
	}

	agentId, err := uuid.ToInt64(clusterIdStr)
	if err != nil {
		return 0, "", "", "", fmt.Errorf("%s header: failed to parse: %w", httpz2.AuthorizationHeader, err)
	}
	if token == "" {
		return 0, "", "", "", fmt.Errorf("%s header: empty token", httpz2.AuthorizationHeader)
	}
	return agentId, tokenType, token, clusterIdStr, nil
}

func constructUserImpersonationConfig(auth *pluralapi.AuthorizeProxyUserResponse) (*rpc2.ImpersonationConfig, error) {
	switch imp := auth.GetAccessAs().AccessAs.(type) {
	case *pluralapi.AccessAsProxyAuthorization_Agent:
		return nil, nil
	case *pluralapi.AccessAsProxyAuthorization_User:
		return &rpc2.ImpersonationConfig{
			Username: auth.User.Username,
			Groups:   auth.AccessAs.GetUser().Groups,
			Roles:    auth.AccessAs.GetUser().Roles,
		}, nil
	default:
		// Normally this should never happen
		return nil, fmt.Errorf("unexpected user impersonation mode: %T", imp)
	}
}
