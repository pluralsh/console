package server

import (
	"strings"
	"time"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultListenNetwork          = "tcp"
	defaultListenAddress          = "0.0.0.0:8156"
	defaultListenMaxConnectionAge = 2 * time.Hour
	defaultListenGracePeriod      = 5 * time.Second
	// Room for prompt attachments (console caps them at 24 MiB per prompt) inside one Control frame.
	defaultListenMaxMessageSize = 32 * 1024 * 1024
	DefaultUrlPathPrefix        = "/ext/devbox"
	defaultConsoleTimeout       = 30 * time.Second
	defaultStreamTokenLeeway    = 10 * time.Second
	defaultRoutingTimeout       = 10 * time.Second
	defaultRedisConnInfoTTL     = 5 * time.Minute
	defaultRedisConnInfoRefresh = 4 * time.Minute
)

func ApplyDefaults(config *kascfg.ConfigurationFile) {
	d := config.Devbox
	if d == nil {
		return
	}
	prototool.NotNil(&d.Listen)
	prototool.StringPtr(&d.Listen.Network, defaultListenNetwork)
	prototool.String(&d.Listen.Address, defaultListenAddress)
	prototool.Duration(&d.Listen.MaxConnectionAge, defaultListenMaxConnectionAge)
	prototool.Duration(&d.Listen.ListenGracePeriod, defaultListenGracePeriod)
	prototool.Uint32(&d.Listen.MaxMessageSize, defaultListenMaxMessageSize)

	prototool.String(&d.UrlPathPrefix, DefaultUrlPathPrefix)
	d.UrlPathPrefix = "/" + strings.Trim(d.UrlPathPrefix, "/")

	prototool.NotNil(&d.Console)
	prototool.Duration(&d.Console.Timeout, defaultConsoleTimeout)
	if d.Console.AuthenticationSecretFile == "" && config.Api != nil && config.Api.Listen != nil {
		d.Console.AuthenticationSecretFile = config.Api.Listen.AuthenticationSecretFile
	}

	prototool.NotNil(&d.Streams)
	prototool.String(&d.Streams.TokenAudience, DefaultStreamTokenAudience)
	prototool.Duration(&d.Streams.TokenLeeway, defaultStreamTokenLeeway)

	prototool.Duration(&d.RoutingTimeout, defaultRoutingTimeout)
	prototool.Duration(&d.RedisConnInfoTtl, defaultRedisConnInfoTTL)
	prototool.Duration(&d.RedisConnInfoRefresh, defaultRedisConnInfoRefresh)
}
