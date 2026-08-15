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
	envProviderToken          = "PROVIDER_TOKENS"
	envProviderServiceAccount = "PROVIDER_SERVICE_ACCOUNT"
	envProviderAWSRegion      = "PROVIDER_AWS_REGION"
	envBedrockMantleKey       = "BEDROCK_MANTLE_KEY"
	envBedrockMantleAWSRegion = "BEDROCK_MANTLE_AWS_REGION"
	envBedrockMantlePrefixes  = "BEDROCK_MANTLE_MODEL_PREFIXES"
	envMantleSigV4            = "MANTLE_SIGV4"

	defaultPort                   = 8000
	defaultProvider               = api.ProviderOllama
	defaultAddress                = "0.0.0.0"
	defaultBedrockMantleAWSRegion = "us-east-1"
)

var (
	argProvider               = pflag.String("provider", defaultProvider.String(), "Provider name. Must be one of: ollama, openai, vertex. Defaults to 'ollama' type API.")
	argProviderHost           = pflag.String("provider-host", "", "Provider host address to access the API i.e. https://api.openai.com")
	argProviderTokens         = pflag.StringSlice("provider-tokens", helpers.GetPluralEnvSlice(envProviderToken, []string{}), "Provider tokens used to connect to the API if needed. Can be overridden via PLRL_PROVIDER_TOKEN env var.")
	argProviderServiceAccount = pflag.String("provider-service-account", helpers.GetPluralEnv(envProviderServiceAccount, ""), "Provider service account file used to connect to the API if needed. Can be overridden via PLRL_PROVIDER_SERVICE_ACCOUNT env var.")
	argsProviderAWSRegion     = pflag.String("provider-aws-region", helpers.GetPluralEnv(envProviderAWSRegion, ""), "Provider AWS region used to connect to BedRock API.")
	argBedrockMantleKey       = pflag.String("bedrock-mantle-key", helpers.GetPluralEnv(envBedrockMantleKey, ""), "Amazon Bedrock Mantle API key. Can be overridden via PLRL_BEDROCK_MANTLE_KEY env var.")
	argBedrockMantleAWSRegion = pflag.String("bedrock-mantle-aws-region", helpers.GetPluralEnv(envBedrockMantleAWSRegion, defaultBedrockMantleAWSRegion), "AWS region for Amazon Bedrock Mantle. Defaults to us-east-1.")
	argBedrockMantlePrefixes  = pflag.StringSlice("bedrock-mantle-model-prefixes", helpers.GetPluralEnvSlice(envBedrockMantlePrefixes, []string{"gpt-5.4"}), "OpenAI model prefixes routed to Amazon Bedrock Mantle.")
	argMantleSigV4            = pflag.Bool("mantle-sigv4", helpers.GetPluralEnvBool(envMantleSigV4, false), "Use AWS SigV4 authentication from the default credentials chain for Amazon Bedrock Mantle. Can be overridden via PLRL_MANTLE_SIGV4 env var.")
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

func ProviderServiceAccount() string {
	if argProviderServiceAccount != nil && len(*argProviderServiceAccount) > 0 && Provider() == api.ProviderVertex {
		return *argProviderServiceAccount
	}
	return ""
}

func ProviderAwsRegion() string {
	if argsProviderAWSRegion != nil && len(*argsProviderAWSRegion) > 0 && Provider() == api.ProviderBedrock {
		return *argsProviderAWSRegion
	}
	return ""
}

func ProviderTokens() []string {
	if argProviderTokens != nil && len(*argProviderTokens) > 0 && Provider() == api.ProviderOpenAI {
		return *argProviderTokens
	}

	return []string{}
}

func BedrockMantleKey() string {
	if argBedrockMantleKey == nil {
		return ""
	}

	return *argBedrockMantleKey
}

func BedrockMantleAWSRegion() string {
	if argBedrockMantleAWSRegion == nil {
		return defaultBedrockMantleAWSRegion
	}

	return *argBedrockMantleAWSRegion
}

func BedrockMantleModelPrefixes() []string {
	if argBedrockMantlePrefixes == nil {
		return nil
	}

	return *argBedrockMantlePrefixes
}

func MantleSigV4() bool {
	return argMantleSigV4 != nil && *argMantleSigV4
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
	return Provider() == api.ProviderOpenAI || Provider() == api.ProviderBedrock || Provider() == api.ProviderOllama
}
