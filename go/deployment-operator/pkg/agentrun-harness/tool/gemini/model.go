package gemini

type Model string

const (
	ModelGemini3ProPreview   Model = "gemini-3-pro-preview"
	ModelGemini3FlashPreview Model = "gemini-3-flash-preview"
	ModelGemini25Pro         Model = "gemini-2.5-pro"
	ModelGemini25Flash       Model = "gemini-2.5-flash"
	ModelGemini25FlashLite   Model = "gemini-2.5-flash-lite"
	ModelGemini20Flash       Model = "gemini-2.0-flash"
	ModelGemini20FlashLite   Model = "gemini-2.0-flash-lite"
)

func EnsureModel(model string) Model {
	if len(model) == 0 {
		return ModelGemini3FlashPreview
	}

	return Model(model)
}
