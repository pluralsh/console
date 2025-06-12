package args

import (
	"github.com/spf13/pflag"
)

func init() {
	pflag.Parse()
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
