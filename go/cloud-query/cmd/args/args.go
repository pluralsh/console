package args

import (
	"flag"
	"fmt"
	"strconv"
	"time"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

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
	defaultExtensionsDir          = "./bin"
	defaultDatabaseDir            = "./bin/pg"
	defaultDatabaseVersion        = embeddedpostgres.V15
	defaultDatabasePort           = 5432
	defaultDatabaseMaxConnections = 200
	defaultConnectionTTL          = 15 * time.Minute
	defaultServerAddress          = ":9192"
	defaultServerEnableReflection = false
)

var (
	argExtensionsDir          = pflag.String("extensions-dir", defaultExtensionsDir, "directory where extensions are stored")
	argDatabaseDir            = pflag.String("database-dir", defaultDatabaseDir, "path to the database")
	argDatabaseVersion        = pflag.String("database-version", string(defaultDatabaseVersion), "version of the embedded PostgreSQL database to use")
	argDatabasePort           = pflag.Uint32("database-port", defaultDatabasePort, "port on which the embedded PostgreSQL database will listen")
	argDatabaseMaxConnections = pflag.Int("database-max-connections", defaultDatabaseMaxConnections, "maximum number of connections to the embedded PostgreSQL database")
	argConnectionTTL          = pflag.Duration("connection-ttl", defaultConnectionTTL, "default TTL for connections in the pool, connections will be closed after this duration if not used")
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

func DatabaseMaxConnections() string {
	if *argDatabaseMaxConnections <= 0 {
		return fmt.Sprintf("%d", defaultDatabaseMaxConnections)
	}

	return strconv.Itoa(*argDatabaseMaxConnections)
}

func DatabaseExtensionsDir() string {
	if len(*argExtensionsDir) == 0 {
		return defaultExtensionsDir
	}

	return *argExtensionsDir
}

func DatabaseDir() string {
	if len(*argDatabaseDir) == 0 {
		return defaultDatabaseDir
	}

	return *argDatabaseDir
}

func DatabaseDataDir() string {
	return fmt.Sprintf("%s/data", DatabaseDir())
}

func DatabaseVersion() embeddedpostgres.PostgresVersion {
	if len(*argDatabaseVersion) == 0 {
		return defaultDatabaseVersion
	}

	return embeddedpostgres.PostgresVersion(*argDatabaseVersion)
}

func DatabasePort() uint32 {
	if *argDatabasePort <= 0 {
		return defaultDatabasePort
	}

	return *argDatabasePort
}

func ConnectionTTL() time.Duration {
	return *argConnectionTTL
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
