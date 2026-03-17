package args

import (
	"flag"
	"os"
	"strconv"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"k8s.io/klog/v2"
)

const (
	defaultListenAddr      = ":8080"
	defaultGRPCEndpoint    = "localhost:50051"
	defaultConfigTTL       = 60 * time.Second
	defaultGRPCTimeout     = 10 * time.Second
	defaultUpstreamTimeout = 30 * time.Second
	defaultQueryRPS        = 10
	defaultQueryBurst      = 10
)

const (
	envListenAddr      = "OBS_PROXY_LISTEN_ADDR"
	envGRPCEndpoint    = "OBS_PROXY_CONSOLE_GRPC_ENDPOINT"
	envConfigTTL       = "OBS_PROXY_CONFIG_TTL"
	envGRPCTimeout     = "OBS_PROXY_GRPC_TIMEOUT"
	envUpstreamTimeout = "OBS_PROXY_UPSTREAM_TIMEOUT"
	envQueryRPS        = "OBS_PROXY_QUERY_RPS"
	envQueryBurst      = "OBS_PROXY_QUERY_BURST"
)

var (
	argListenAddr      = flag.String("listen-addr", envOrDefault(envListenAddr, defaultListenAddr), "HTTP listen address")
	argGRPCEndpoint    = flag.String("console-grpc-endpoint", envOrDefault(envGRPCEndpoint, defaultGRPCEndpoint), "Console gRPC endpoint")
	argConfigTTL       = flag.Duration("config-ttl", envDurationOrDefault(envConfigTTL, defaultConfigTTL), "Config cache TTL")
	argGRPCTimeout     = flag.Duration("grpc-timeout", envDurationOrDefault(envGRPCTimeout, defaultGRPCTimeout), "Console gRPC timeout")
	argUpstreamTimeout = flag.Duration("upstream-timeout", envDurationOrDefault(envUpstreamTimeout, defaultUpstreamTimeout), "Upstream request timeout")
	argQueryRPS        = flag.Int("query-rps", envIntOrDefault(envQueryRPS, defaultQueryRPS), "Per-IP query requests per second")
	argQueryBurst      = flag.Int("query-burst", envIntOrDefault(envQueryBurst, defaultQueryBurst), "Per-IP query burst")
)

func Init() {
	klog.InitFlags(flag.CommandLine)
	flag.Parse()

	klog.V(logging.LevelMinimal).Infof("configured log level v=%s", flag.Lookup("v").Value.String())
}

func ListenAddr() string {
	if *argListenAddr == "" {
		return defaultListenAddr
	}
	return *argListenAddr
}

func ConsoleGRPCEndpoint() string {
	if *argGRPCEndpoint == "" {
		return defaultGRPCEndpoint
	}
	return *argGRPCEndpoint
}

func ConfigTTL() time.Duration {
	if *argConfigTTL <= 0 {
		return defaultConfigTTL
	}
	return *argConfigTTL
}

func GRPCTimeout() time.Duration {
	if *argGRPCTimeout <= 0 {
		return defaultGRPCTimeout
	}
	return *argGRPCTimeout
}

func UpstreamTimeout() time.Duration {
	if *argUpstreamTimeout <= 0 {
		return defaultUpstreamTimeout
	}
	return *argUpstreamTimeout
}

func QueryRPS() int {
	if *argQueryRPS <= 0 {
		return defaultQueryRPS
	}
	return *argQueryRPS
}

func QueryBurst() int {
	if *argQueryBurst <= 0 {
		return defaultQueryBurst
	}
	return *argQueryBurst
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func envDurationOrDefault(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	dur, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return dur
}

func envIntOrDefault(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err == nil {
		return parsed
	}

	return fallback
}
