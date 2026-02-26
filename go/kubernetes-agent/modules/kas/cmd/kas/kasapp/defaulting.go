package kasapp

import (
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	agent_configuration_server "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/server"
	kubernetes_api_server "github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/server"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	observability_server "github.com/pluralsh/kubernetes-agent/pkg/module/observability/server"
	usage_metrics_server "github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics/server"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultListenGracePeriod = 5 * time.Second

	defaultAgentInfoCacheTTL         = 5 * time.Minute
	defaultAgentInfoCacheErrorTTL    = 1 * time.Minute
	defaultAgentRedisConnInfoTTL     = 5 * time.Minute
	defaultAgentRedisConnInfoRefresh = 4 * time.Minute
	defaultAgentRedisConnInfoGC      = 10 * time.Minute

	defaultAgentListenNetwork                      = "tcp"
	defaultAgentListenAddress                      = "127.0.0.1:8150"
	defaultAgentListenConnectionsPerTokenPerMinute = 40000
	defaultAgentListenMaxConnectionAge             = 2 * time.Hour

	defaultRedisDialTimeout  = 5 * time.Second
	defaultRedisWriteTimeout = 3 * time.Second
	defaultRedisKeyPrefix    = "gitlab-kas"
	defaultRedisNetwork      = "tcp"

	defaultApiListenNetwork          = "tcp"
	defaultApiListenAddress          = "127.0.0.1:8153"
	defaultApiListenMaxConnectionAge = 2 * time.Hour

	defaultPrivateApiListenNetwork = "tcp"
	defaultPrivateApiListenAddress = "127.0.0.1:8155"
	// Should be equal to the defaultAgentListenMaxConnectionAge as agent's tunnel requests go via private API server.
	defaultPrivateApiListenMaxConnectionAge = defaultAgentListenMaxConnectionAge
)

var (
	defaulters = []modserver.ApplyDefaults{
		observability_server.ApplyDefaults,
		agent_configuration_server.ApplyDefaults,
		usage_metrics_server.ApplyDefaults,
		kubernetes_api_server.ApplyDefaults,
	}
)

func ApplyDefaultsToKasConfigurationFile(cfg *kascfg.ConfigurationFile) {
	prototool.NotNil(&cfg.Agent)
	defaultAgent(cfg.Agent)

	prototool.NotNil(&cfg.Redis)
	defaultRedis(cfg.Redis)

	prototool.NotNil(&cfg.Api)
	defaultApi(cfg.Api)

	prototool.NotNil(&cfg.PrivateApi)
	defaultPrivateApi(cfg.PrivateApi)

	for _, defaulter := range defaulters {
		defaulter(cfg)
	}
}

func defaultApi(api *kascfg.ApiCF) {
	prototool.NotNil(&api.Listen)
	prototool.StringPtr(&api.Listen.Network, defaultApiListenNetwork)
	prototool.String(&api.Listen.Address, defaultApiListenAddress)
	prototool.Duration(&api.Listen.MaxConnectionAge, defaultApiListenMaxConnectionAge)
	prototool.Duration(&api.Listen.ListenGracePeriod, defaultListenGracePeriod)
}

func defaultPrivateApi(api *kascfg.PrivateApiCF) {
	prototool.NotNil(&api.Listen)
	prototool.StringPtr(&api.Listen.Network, defaultPrivateApiListenNetwork)
	prototool.String(&api.Listen.Address, defaultPrivateApiListenAddress)
	prototool.Duration(&api.Listen.MaxConnectionAge, defaultPrivateApiListenMaxConnectionAge)
	prototool.Duration(&api.Listen.ListenGracePeriod, defaultListenGracePeriod)
}

func defaultAgent(a *kascfg.AgentCF) {
	prototool.NotNil(&a.Listen)
	prototool.StringPtr(&a.Listen.Network, defaultAgentListenNetwork)
	prototool.String(&a.Listen.Address, defaultAgentListenAddress)
	prototool.Uint32(&a.Listen.ConnectionsPerTokenPerMinute, defaultAgentListenConnectionsPerTokenPerMinute)
	prototool.Duration(&a.Listen.MaxConnectionAge, defaultAgentListenMaxConnectionAge)
	prototool.Duration(&a.Listen.ListenGracePeriod, defaultListenGracePeriod)

	prototool.Duration(&a.InfoCacheTtl, defaultAgentInfoCacheTTL)
	prototool.Duration(&a.InfoCacheErrorTtl, defaultAgentInfoCacheErrorTTL)
	prototool.Duration(&a.RedisConnInfoTtl, defaultAgentRedisConnInfoTTL)
	prototool.Duration(&a.RedisConnInfoRefresh, defaultAgentRedisConnInfoRefresh)
	prototool.Duration(&a.RedisConnInfoGc, defaultAgentRedisConnInfoGC)
}

func defaultRedis(r *kascfg.RedisCF) {
	prototool.Duration(&r.DialTimeout, defaultRedisDialTimeout)
	prototool.Duration(&r.WriteTimeout, defaultRedisWriteTimeout)
	prototool.String(&r.KeyPrefix, defaultRedisKeyPrefix)
	prototool.String(&r.Network, defaultRedisNetwork)
}
