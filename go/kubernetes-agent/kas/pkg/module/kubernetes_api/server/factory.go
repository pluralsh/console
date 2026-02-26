package server

import (
	"crypto/sha256"
	"crypto/tls"
	"encoding/binary"
	"fmt"
	"net"

	"github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/plural/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	redistool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer"
)

const (
	k8sApiRequestCountKnownMetric        = "k8s_api_proxy_request"
	usersCiTunnelInteractionsCountMetric = "agent_users_using_ci_tunnel"
	// `ci_access` metric names
	k8sApiProxyRequestsViaCiAccessMetricName             = "k8s_api_proxy_requests_via_ci_access"
	k8sApiProxyRequestsUniqueUsersViaCiAccessMetricName  = "k8s_api_proxy_requests_unique_users_via_ci_access"
	k8sApiProxyRequestsUniqueAgentsViaCiAccessMetricName = "k8s_api_proxy_requests_unique_agents_via_ci_access"
	// `user_access` metric names
	k8sApiProxyRequestsViaUserAccessMetricName             = "k8s_api_proxy_requests_via_user_access"
	k8sApiProxyRequestsUniqueUsersViaUserAccessMetricName  = "k8s_api_proxy_requests_unique_users_via_user_access"
	k8sApiProxyRequestsUniqueAgentsViaUserAccessMetricName = "k8s_api_proxy_requests_unique_agents_via_user_access"
	// PAT access metric names
	k8sApiProxyRequestsViaPatAccessMetricName             = "k8s_api_proxy_requests_via_pat_access"
	k8sApiProxyRequestsUniqueUsersViaPatAccessMetricName  = "k8s_api_proxy_requests_unique_users_via_pat_access"
	k8sApiProxyRequestsUniqueAgentsViaPatAccessMetricName = "k8s_api_proxy_requests_unique_agents_via_pat_access"
)

type Factory struct {
}

func (f *Factory) New(config *modserver.Config) (modserver.Module, error) {
	k8sApi := config.Config.Agent.KubernetesApi
	if k8sApi == nil {
		return nopModule{}, nil
	}
	listenCfg := k8sApi.Listen
	certFile := listenCfg.CertificateFile
	keyFile := listenCfg.KeyFile
	var listener func() (net.Listener, error)

	tlsConfig, err := tlstool.MaybeDefaultServerTLSConfig(certFile, keyFile)
	if err != nil {
		return nil, err
	}
	if tlsConfig != nil {
		listener = func() (net.Listener, error) {
			return tls.Listen(*listenCfg.Network, listenCfg.Address, tlsConfig)
		}
	} else {
		listener = func() (net.Listener, error) {
			return net.Listen(*listenCfg.Network, listenCfg.Address)
		}
	}
	serverName := fmt.Sprintf("%s/%s/%s", config.KasName, config.Version, config.CommitId)
	var allowedOriginUrls []string
	allowedAgentCacheTtl := k8sApi.AllowedAgentCacheTtl.AsDuration()
	allowedAgentCacheErrorTtl := k8sApi.AllowedAgentCacheErrorTtl.AsDuration()
	tracer := config.TraceProvider.Tracer(kubernetes_api.ModuleName)
	m := &module{
		log: config.Log,
		proxy: kubernetesApiProxy{
			log:                 config.Log,
			api:                 config.Api,
			kubernetesApiClient: rpc.NewKubernetesApiClient(config.AgentConn),
			pluralUrl:           config.Config.PluralUrl,
			allowedOriginUrls:   allowedOriginUrls,
			allowedAgentsCache: cache.NewWithError[string, *api.AllowedAgentsForJob](
				allowedAgentCacheTtl,
				allowedAgentCacheErrorTtl,
				&redistool2.ErrCacher[string]{
					Log:          config.Log,
					ErrRep:       modshared.ApiToErrReporter(config.Api),
					Client:       config.RedisClient,
					ErrMarshaler: prototool.ProtoErrMarshaler{},
					KeyToRedisKey: func(jobToken string) string {
						// Hash half of the token. Even if that hash leaks, it's not a big deal.
						// We do the same in api.AgentToken2key().
						n := len(jobToken) / 2
						tokenHash := sha256.Sum256([]byte(jobToken[:n]))
						return config.Config.Redis.KeyPrefix + ":allowed_agents_errs:" + string(tokenHash[:])
					},
				},
				tracer,
				nil,
			),
			authorizeProxyUserCache: cache.NewWithError[proxyUserCacheKey, *api.AuthorizeProxyUserResponse](
				allowedAgentCacheTtl,
				allowedAgentCacheErrorTtl,
				&redistool2.ErrCacher[proxyUserCacheKey]{
					Log:           config.Log,
					ErrRep:        modshared.ApiToErrReporter(config.Api),
					Client:        config.RedisClient,
					ErrMarshaler:  prototool.ProtoErrMarshaler{},
					KeyToRedisKey: getAuthorizedProxyUserCacheKey(config.Config.Redis.KeyPrefix),
				},
				tracer,
				nil,
			),
			requestCounter:           config.UsageTracker.RegisterCounter(k8sApiRequestCountKnownMetric),
			ciTunnelUsersCounter:     config.UsageTracker.RegisterUniqueCounter(usersCiTunnelInteractionsCountMetric),
			ciAccessRequestCounter:   config.UsageTracker.RegisterCounter(k8sApiProxyRequestsViaCiAccessMetricName),
			ciAccessUsersCounter:     config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueUsersViaCiAccessMetricName),
			ciAccessAgentsCounter:    config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueAgentsViaCiAccessMetricName),
			userAccessRequestCounter: config.UsageTracker.RegisterCounter(k8sApiProxyRequestsViaUserAccessMetricName),
			userAccessUsersCounter:   config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueUsersViaUserAccessMetricName),
			userAccessAgentsCounter:  config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueAgentsViaUserAccessMetricName),
			patAccessRequestCounter:  config.UsageTracker.RegisterCounter(k8sApiProxyRequestsViaPatAccessMetricName),
			patAccessUsersCounter:    config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueUsersViaPatAccessMetricName),
			patAccessAgentsCounter:   config.UsageTracker.RegisterUniqueCounter(k8sApiProxyRequestsUniqueAgentsViaPatAccessMetricName),
			responseSerializer:       serializer.NewCodecFactory(runtime.NewScheme()),
			traceProvider:            config.TraceProvider,
			tracePropagator:          config.TracePropagator,
			meterProvider:            config.MeterProvider,
			serverName:               serverName,
			serverVia:                "gRPC/1.0 " + serverName,
			urlPathPrefix:            k8sApi.UrlPathPrefix,
			listenerGracePeriod:      listenCfg.ListenGracePeriod.AsDuration(),
			shutdownGracePeriod:      listenCfg.ShutdownGracePeriod.AsDuration(),
		},
		listener: listener,
	}
	config.RegisterAgentApi(&rpc.KubernetesApi_ServiceDesc)
	return m, nil
}

func (f *Factory) Name() string {
	return kubernetes_api.ModuleName
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	// Start after servers because proxy uses agent connection (config.AgentConn), which works by accessing
	// in-memory private API server. So proxy needs to start after and stop before that server.
	return modshared.ModuleStartAfterServers
}

func getAuthorizedProxyUserCacheKey(redisKeyPrefix string) redistool2.KeyToRedisKey[proxyUserCacheKey] {
	return func(key proxyUserCacheKey) string {
		// Hash half of the token. Even if that hash leaks, it's not a big deal.
		// We do the same in api.AgentToken2key().
		n := len(key.accessKey) / 2

		// Use delimiters between fields to ensure hash of "ab" + "c" is different from "a" + "bc".
		h := sha256.New()
		id := make([]byte, 8)
		binary.LittleEndian.PutUint64(id, uint64(key.agentId))
		h.Write(id)
		h.Write([]byte{11}) // delimiter
		h.Write([]byte(key.accessKey[:n]))
		h.Write([]byte{11}) // delimiter
		h.Write([]byte(key.clusterId))
		tokenHash := h.Sum(nil)
		return redisKeyPrefix + ":auth_proxy_user_errs:" + string(tokenHash)
	}
}
