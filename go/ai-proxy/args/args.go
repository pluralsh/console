package args

import (
	"flag"
	"fmt"
	"net"

	"github.com/samber/lo"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/internal/helpers"
	"github.com/pluralsh/console/go/ai-proxy/internal/log"
)

const (
	envProviderToken = "PROVIDER_TOKEN"

	defaultPort     = 8000
	defaultProvider = api.ProviderOllama
	defaultAddress  = "0.0.0.0"
)

var (
	argProvider      = pflag.String("provider", defaultProvider.String(), "Provider name. Must be one of: ollama, openai. Defaults to 'ollama' type API.")
	argProviderHost  = pflag.String("provider-host", "", "Provider host address to access the API i.e. https://api.openai.com")
	argProviderToken = pflag.String("provider-token", helpers.GetPluralEnv(envProviderToken, ""), "Provider token used to connect to the API if needed. Can be overridden via PLRL_PROVIDER_TOKEN env var.")
	argPort          = pflag.Int("port", defaultPort, "The port to listen on. Defaults to port 8000.")
	argAddress       = pflag.IP("address", net.ParseIP(defaultAddress), "The IP address to serve on. Defaults to 0.0.0.0 (all interfaces).")
)

func init() {
	// Init klog
	fs := flag.NewFlagSet("", flag.PanicOnError)
	klog.InitFlags(fs)

	// Default log level to 1
	_ = fs.Set("v", lo.ToPtr(log.LogLevelDefault).String())

	pflag.CommandLine.AddGoFlagSet(fs)
	pflag.Parse()
}

func Provider() api.Provider {
	provider, err := api.ToProvider(*argProvider)
	if err != nil {
		klog.ErrorS(
			err,
			"Failed to parse '--provider' argument. Using default provider.",
			"provider",
			*argProvider,
			"default",
			defaultProvider,
		)

		return defaultProvider
	}

	return provider
}

func ProviderHost() string {
	if len(*argProviderHost) == 0 {
		panic(fmt.Errorf("provider host is required"))
	}

	return *argProviderHost
}

func ProviderToken() string {
	if len(*argProviderToken) == 0 && Provider() != defaultProvider {
		panic(fmt.Errorf("provider secret is required"))
	}

	return *argProviderToken
}

func Address() string {
	if argAddress == nil {
		klog.ErrorS(
			fmt.Errorf("could not parse address"),
			"Failed to parse '--address' argument. Using default address.",
			"address",
			*argAddress,
			"default",
			defaultAddress,
		)

		return fmt.Sprintf("%s:%d", defaultAddress, *argPort)
	}

	return fmt.Sprintf("%s:%d", *argAddress, *argPort)
}
