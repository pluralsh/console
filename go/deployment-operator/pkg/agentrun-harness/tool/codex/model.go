package codex

type Model string

const (
	ModelGPT5 Model = "gpt-5"

	// Primary Codex models
	ModelGPT51Codex     Model = "gpt-5.1-codex"
	ModelGPT51CodexMini Model = "gpt-5.1-codex-mini"
	ModelGPT54          Model = "gpt-5.4"
	ModelCodexMini      Model = "codex-mini-latest"

	// Optional powerful Codex options
	ModelGPT52Codex Model = "gpt-5.2-codex"

	defaultModel = ModelGPT54
)

// EnsureModel returns a sensible default
func EnsureModel(model string) Model {
	if len(model) == 0 {
		return defaultModel
	}

	return Model(model)
}
