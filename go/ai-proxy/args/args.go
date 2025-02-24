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
	envProviderToken          = "PROVIDER_TOKEN"
	envProviderServiceAccount = "PROVIDER_SERVICE_ACCOUNT"
	envProviderAWSRegion      = "PROVIDER_AWS_REGION"

	defaultPort     = 8000
	defaultProvider = api.ProviderOllama
	defaultAddress  = "0.0.0.0"
)

var (
	argProvider               = pflag.String("provider", defaultProvider.String(), "Provider name. Must be one of: ollama, openai, vertex. Defaults to 'ollama' type API.")
	argProviderHost           = pflag.String("provider-host", "", "Provider host address to access the API i.e. https://api.openai.com")
	argProviderToken          = pflag.String("provider-token", helpers.GetPluralEnv(envProviderToken, ""), "Provider token used to connect to the API if needed. Can be overridden via PLRL_PROVIDER_TOKEN env var.")
	argProviderServiceAccount = pflag.String("provider-service-account", helpers.GetPluralEnv(envProviderServiceAccount, ""), "Provider service account file used to connect to the API if needed. Can be overridden via PLRL_PROVIDER_SERVICE_ACCOUNT env var.")
	argsProviderAWSRegion     = pflag.String("provider-aws-region", helpers.GetPluralEnv(envProviderAWSRegion, ""), "Provider AWS region used to connect to BedRock API.")
	argPort                   = pflag.Int("port", defaultPort, "The port to listen on. Defaults to port 8000.")
	argAddress                = pflag.IP("address", net.ParseIP(defaultAddress), "The IP address to serve on. Defaults to 0.0.0.0 (all interfaces).")
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
	if Provider() == api.ProviderBedrock {
		return ""
	}

	if len(*argProviderHost) == 0 {
		panic(fmt.Errorf("provider host is required"))
	}

	return *argProviderHost
}

func ProviderCredentials() string {
	if len(*argProviderToken) > 0 && Provider() == api.ProviderOpenAI {
		return *argProviderToken
	}

	if len(*argProviderServiceAccount) > 0 && Provider() == api.ProviderVertex {
		return *argProviderServiceAccount
	}

	if len(*argsProviderAWSRegion) > 0 && Provider() == api.ProviderBedrock {
		return *argsProviderAWSRegion
	}

	if Provider() == defaultProvider {
		return ""
	}

	panic(fmt.Errorf("provider credentials must be provided when %s provider is used", Provider()))
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

func OpenAICompatible() bool {
	return Provider() == api.ProviderOpenAI || Provider() == api.ProviderBedrock
}
