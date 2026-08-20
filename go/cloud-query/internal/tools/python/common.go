package python

import (
	"encoding/json"
	"strconv"
	"strings"
)

func validateRunInput(raw string) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return "{}", nil
	}
	var value map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &value); err != nil || value == nil {
		return "", invalid("input_json must be a JSON object")
	}
	return raw, nil
}

func pythonString(value string) string { return strconv.Quote(value) }

func isJSONObject(value string) bool {
	var object map[string]json.RawMessage
	return json.Unmarshal([]byte(value), &object) == nil && object != nil
}
