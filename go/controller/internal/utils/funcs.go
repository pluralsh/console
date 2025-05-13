package utils

import (
	"strconv"

	"sigs.k8s.io/yaml"
)

func toYaml(val interface{}) (string, error) {
	res, err := yaml.Marshal(val)
	return string(res), err
}

func unquote(s string) string {
	unquoted, err := strconv.Unquote(s)
	if err != nil {
		return s // fallback to original if not a quoted string
	}
	return unquoted
}
