package utils

func ToMapStringAny(m map[string]string) map[string]any {
	result := make(map[string]interface{}, len(m))
	for k, v := range m {
		result[k] = v
	}
	return result
}
