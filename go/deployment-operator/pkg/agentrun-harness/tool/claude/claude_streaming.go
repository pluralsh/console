package claude

// PluralDisableStreamHeader is sent to the Console AI proxy when provider streaming is disabled.
const PluralDisableStreamHeader = "X-Plural-Enable-Stream: false"

const claudeExtraBodyDisableStream = `{"stream":false}`

func (in *Claude) providerStreamingDisabled() bool {
	if in.Config.Run.Runtime == nil || in.Config.Run.Runtime.Config == nil || in.Config.Run.Runtime.Config.Claude == nil {
		return false
	}
	return in.Config.Run.Runtime.Config.Claude.DisableStream
}

func (in *Claude) applyProviderStreamingSettings(settings *SettingsBuilder) {
	if !in.providerStreamingDisabled() {
		return
	}

	settings.WithEnv("CLAUDE_CODE_EXTRA_BODY", claudeExtraBodyDisableStream)
	if in.Config.Run.IsProxyEnabled() {
		settings.WithEnv("ANTHROPIC_CUSTOM_HEADERS", PluralDisableStreamHeader)
	}
}
