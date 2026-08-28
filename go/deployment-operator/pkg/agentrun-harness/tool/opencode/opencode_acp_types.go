package opencode

import toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"

// ACPSettings contains the provider/model values OpenCode advertises through
// ACP session configuration options.
type ACPSettings struct {
	Provider         string
	Model            string
	OpenAICompatible bool
}

// ResolveACPSettings resolves the configured provider and model using the
// same rules as the legacy OpenCode adapter.
func ResolveACPSettings(config toolv1.Config) ACPSettings {
	oc := config.Run.Runtime.Config.OpenCode
	settings := resolveOpenCodeSettings(oc.Provider, oc.Model, oc.OpenAICompatible, config.Run.IsProxyEnabled())
	return ACPSettings{
		Provider:         string(settings.provider),
		Model:            settings.model,
		OpenAICompatible: settings.openaiCompatible,
	}
}
