package args

import (
	"flag"
	"fmt"
	"strconv"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/pkg/log"
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
	defaultExtensionsDir = "./bin"
)

var (
	argExtensionsDir = pflag.String("extensions-dir", defaultExtensionsDir, "Directory where the SQLite extensions will be stored")
)

func ExtensionsDir() string {
	if len(*argExtensionsDir) == 0 {
		return defaultExtensionsDir
	}

	return *argExtensionsDir
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
