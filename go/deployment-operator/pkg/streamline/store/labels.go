package store

import (
	"encoding/json"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func encodeComponentLabels(obj unstructured.Unstructured) (string, error) {
	labels := obj.GetLabels()
	if labels == nil {
		labels = map[string]string{}
	}

	encoded, err := json.Marshal(labels)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

func decodeComponentLabels(raw string) (map[string]string, error) {
	if raw == "" || raw == "null" {
		return map[string]string{}, nil
	}

	labels := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &labels); err != nil {
		return nil, err
	}
	if labels == nil {
		return map[string]string{}, nil
	}

	return labels, nil
}

func escapeSQLString(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
