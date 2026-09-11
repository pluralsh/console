package gemini

type Model string

const (
	ModelGemini35Flash       Model = "gemini-3.5-flash"
	ModelGemini31ProPreview  Model = "gemini-3.1-pro-preview"
	ModelGemini31FlashLite   Model = "gemini-3.1-flash-lite"
	ModelGemini3ProPreview   Model = "gemini-3-pro-preview"
	ModelGemini3FlashPreview Model = "gemini-3-flash-preview"
)

func EnsureModel(model string) Model {
	if len(model) == 0 {
		return ModelGemini35Flash
	}

	return Model(model)
}
