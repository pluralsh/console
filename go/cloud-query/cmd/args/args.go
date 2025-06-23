package args

import (
	"flag"
	"fmt"
	"strconv"
	"time"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"github.com/pluralsh/polly/algorithms"
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
	defaultDatabaseRuntimeDir     = "./bin/runtime"
	defaultDatabaseCacheDir       = "./bin/cache"
	defaultDatabaseDataDir        = "./bin/runtime/data"
	defaultDatabaseUser           = "postgres"
	defaultDatabaseName           = "postgres"
	defaultDatabaseVersion        = embeddedpostgres.V15
	defaultDatabasePort           = 5432
	defaultDatabaseMaxConnections = 200
	defaultDatabaseStartTimeout   = 30 * time.Second
	defaultDatabaseConnectionTTL  = 15 * time.Minute
	defaultServerAddress          = ":9192"
	defaultServerEnableReflection = false
)

var (
	defaultDatabasePassword   = algorithms.String(18) // Generate a random password for the database user
	argExtensionsDir          = pflag.String("extensions-dir", defaultExtensionsDir, "directory where extensions are stored")
	argDatabaseRuntimeDir     = pflag.String("database-runtime-dir", defaultDatabaseRuntimeDir, "directory where the embedded PostgreSQL runtime files are stored")
	argDatabaseCacheDir       = pflag.String("database-cache-dir", defaultDatabaseCacheDir, "directory where the embedded PostgreSQL cache files are stored")
	argDatabaseDataDir        = pflag.String("database-data-dir", defaultDatabaseDataDir, "directory where the embedded PostgreSQL data files are stored")
	argDatabaseVersion        = pflag.String("database-version", string(defaultDatabaseVersion), "version of the embedded PostgreSQL database to use")
	argDatabasePort           = pflag.Uint32("database-port", defaultDatabasePort, "port on which the embedded PostgreSQL database will listen")
	argDatabaseUser           = pflag.String("database-user", defaultDatabaseUser, "default username for the embedded PostgreSQL database")
	argDatabasePassword       = pflag.String("database-password", defaultDatabasePassword, "default password for the embedded PostgreSQL database")
	argDatabaseName           = pflag.String("database-name", defaultDatabaseName, "default database name for the embedded PostgreSQL database")
	argDatabaseStartTimeout   = pflag.Duration("database-start-timeout", defaultDatabaseStartTimeout, "timeout for starting the embedded PostgreSQL database")
	argDatabaseMaxConnections = pflag.Int("database-max-connections", defaultDatabaseMaxConnections, "maximum number of connections to the embedded PostgreSQL database")
	argConnectionTTL          = pflag.Duration("connection-ttl", defaultDatabaseConnectionTTL, "default TTL for connections in the pool, connections will be closed after this duration if not used")
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

func DatabaseRuntimeDir() string {
	if len(*argDatabaseRuntimeDir) == 0 {
		return defaultDatabaseRuntimeDir
	}

	return *argDatabaseRuntimeDir
}

func DatabaseCacheDir() string {
	if len(*argDatabaseCacheDir) == 0 {
		return defaultDatabaseCacheDir
	}

	return *argDatabaseCacheDir
}

func DatabaseDataDir() string {
	if len(*argDatabaseDataDir) == 0 {
		return defaultDatabaseDataDir
	}

	return *argDatabaseDataDir
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

func DatabaseConnectionTTL() time.Duration {
	if *argConnectionTTL <= 0 {
		return defaultDatabaseConnectionTTL
	}

	if *argConnectionTTL < 1*time.Minute {
		klog.Warningf("Connection TTL is set to a very low value (%s), this may lead to performance issues", *argConnectionTTL)
	}

	return *argConnectionTTL
}

func DatabaseStartTimeout() time.Duration {
	if *argDatabaseStartTimeout <= 0 {
		return defaultDatabaseStartTimeout
	}

	return *argDatabaseStartTimeout
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
