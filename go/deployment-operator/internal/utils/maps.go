package utils

// ConvertMap converts map from `string: any` to `string: string`.
func ConvertMap(in map[string]any) map[string]string {
	res := make(map[string]string)
	for k, v := range in {
		value, ok := v.(string)
		if ok {
			res[k] = value
		}
	}
	return res
}

// MapIncludes checks if all `elements` are included in `m` map.
func MapIncludes(m, elements map[string]string) bool {
	for elementKey, elementValue := range elements {
		if mapValue, ok := m[elementKey]; !ok || mapValue != elementValue {
			return false
		}
	}

	return true
}
