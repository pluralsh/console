package contract

import (
	"encoding/json"
	"strings"
)

// NormalizeInput returns raw after verifying it is a bounded JSON object. An
// empty input becomes an empty JSON object.
func NormalizeInput(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "{}", nil
	}
	if len(raw) > MaxInputBytes {
		return "", Invalid("input exceeds the input limit", nil)
	}
	var object map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &object); err != nil || object == nil {
		return "", Invalid("input_json must be a JSON object", err)
	}
	return raw, nil
}

// ValidateRun validates source and normalizes the JSON object supplied as input.
func ValidateRun(input RunInput) (RunInput, error) {
	if strings.TrimSpace(input.Script) == "" {
		return RunInput{}, Invalid("script is required", nil)
	}
	if len(input.Script) > MaxSourceBytes {
		return RunInput{}, Invalid("script exceeds the source limit", nil)
	}
	normalized, err := NormalizeInput(input.InputJSON)
	if err != nil {
		return RunInput{}, err
	}
	input.InputJSON = normalized
	return input, nil
}

// IsJSONObject reports whether raw contains one JSON object and no other value.
func IsJSONObject(raw string) bool {
	var object map[string]json.RawMessage
	return json.Unmarshal([]byte(raw), &object) == nil && object != nil
}
