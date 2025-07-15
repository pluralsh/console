package args

import (
	"flag"
	"fmt"
	"strconv"
	"time"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/common"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

func init() {
	// Init klog with the default flag set
	klog.InitFlags(nil)

	// Add the klog flags to pflag
	pflag.CommandLine.AddGoFlagSet(flag.CommandLine)

	// Use default log level defined by the application
	_ = pflag.CommandLine.Set("v", fmt.Sprintf("%d", log.LogLevelDefault))

	pflag.Parse()

	klog.V(log.LogLevelMinimal).InfoS("configured log level", "v", LogLevel())
}

const (
	defaultDatabaseUser           = "postgres"
	defaultDatabaseName           = "postgres"
	defaultDatabasePassword       = "postgres"
	defaultDatabaseHost           = "localhost"
	defaultDatabasePort           = "5432"
	defaultDatabaseConnectionTTL  = 3 * time.Hour
	defaultServerAddress          = ":9192"
	defaultServerEnableReflection = false
)

var (
	argDatabaseHost           = pflag.String("database-host", defaultDatabaseHost, "host of the PostgreSQL database, leave empty to use the default (localhost)")
	argDatabasePort           = pflag.String("database-port", defaultDatabasePort, "port of the PostgreSQL database, leave empty to use the default (5432)")
	argDatabaseUser           = pflag.String("database-user", defaultDatabaseUser, "default username for the PostgreSQL database")
	argDatabasePassword       = pflag.String("database-password", common.GetPluralEnv("PG_PASSWORD", defaultDatabasePassword), "default password for the PostgreSQL database")
	argDatabaseName           = pflag.String("database-name", defaultDatabaseName, "default database name for the PostgreSQL database")
	argDatabaseConnectionTTL  = pflag.Duration("connection-ttl", defaultDatabaseConnectionTTL, "default TTL for connections in the pool, connections will be closed after this duration if not used")
	argServerAddress          = pflag.String("server-address", "", "address on which the gRPC server will listen, leave empty to use the default (:9192)")
	argServerTLSCertPath      = pflag.String("server-tls-cert", "", "path to the TLS certificate file for the gRPC server")
	argServerTLSKeyPath       = pflag.String("server-tls-key", "", "path to the TLS key file for the gRPC server")
	argServerEnableReflection = pflag.Bool("server-enable-reflection", defaultServerEnableReflection, "enable gRPC reflection for the server, useful for debugging and introspection")
)

func ServerEnableReflection() bool {
	return *argServerEnableReflection
}

func ServerAddress() string {
	if len(*argServerAddress) == 0 {
		return defaultServerAddress
	}

	return *argServerAddress
}

func ServerTLSCertPath() string {
	if len(*argServerTLSCertPath) == 0 {
		return ""
	}

	return *argServerTLSCertPath
}

func ServerTLSKeyPath() string {
	if len(*argServerTLSKeyPath) == 0 {
		return ""
	}

	return *argServerTLSKeyPath
}

func DatabaseUser() string {
	if len(*argDatabaseUser) == 0 {
		return defaultDatabaseUser
	}

	return *argDatabaseUser
}

func DatabasePassword() string {
	if len(*argDatabasePassword) == 0 {
		return defaultDatabasePassword
	}

	return *argDatabasePassword
}

func DatabaseName() string {
	if len(*argDatabaseName) == 0 {
		return defaultDatabaseName
	}

	return *argDatabaseName
}

func DatabaseHost() string {
	if argDatabaseHost == nil || len(*argDatabaseHost) == 0 {
		return defaultDatabaseHost
	}

	return *argDatabaseHost
}

func DatabasePort() string {
	if argDatabasePort == nil || len(*argDatabasePort) == 0 {
		return defaultDatabasePort
	}

	return *argDatabasePort
}

func DatabaseConnectionTTL() time.Duration {
	if *argDatabaseConnectionTTL <= 0 {
		return defaultDatabaseConnectionTTL
	}

	if *argDatabaseConnectionTTL < 10*time.Minute {
		klog.Warningf("Connection TTL is set to a very low value (%s), this may lead to performance issues", *argDatabaseConnectionTTL)
	}

	return *argDatabaseConnectionTTL
}

func LogLevel() klog.Level {
	v := pflag.Lookup("v")
	if v == nil {
		return log.LogLevelDefault
	}

	level, err := strconv.ParseInt(v.Value.String(), 10, 32)
	if err != nil {
		klog.ErrorS(err, "Could not parse log level", "level", v.Value.String(), "default", log.LogLevelDefault)
		return log.LogLevelDefault
	}

	return klog.Level(level)
}
