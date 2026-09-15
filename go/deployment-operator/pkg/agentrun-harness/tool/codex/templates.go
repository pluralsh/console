package codex

import (
	_ "embed"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"text/template"
)

//go:embed templates/config.toml.gotmpl
var configTemplateText string

// These names identify Codex's embedded native configuration template and
// generated file.
const (
	codexConfigTemplateName = "config.toml"
	codexConfigFileName     = "config.toml"
)

func configTemplate(input *ConfigTemplateInput) (fileName, content string, err error) {
	quote := func(value string) (string, error) {
		quoted, err := json.Marshal(value)
		return string(quoted), err
	}
	tmpl, err := template.New(codexConfigTemplateName).Funcs(template.FuncMap{
		"quote": quote,
	}).Parse(configTemplateText)
	if err != nil {
		return "", "", err
	}

	output := new(strings.Builder)
	if err := tmpl.Execute(output, input); err != nil {
		return codexConfigFileName, "", err
	}
	return codexConfigFileName, output.String(), nil
}

func (agent *Agent) writeConfig(basePath string, input *ConfigTemplateInput) (string, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return "", err
	}

	_, content, err := configTemplate(input)
	if err != nil {
		return "", err
	}
	filePath := filepath.Join(basePath, codexConfigFileName)
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return "", err
	}
	return filePath, nil
}

func (agent *Agent) templateKeyValues(values map[string]string) []configTemplateKeyValue {
	if len(values) == 0 {
		return nil
	}

	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	result := make([]configTemplateKeyValue, 0, len(keys))
	for _, key := range keys {
		result = append(result, configTemplateKeyValue{Key: key, Value: values[key]})
	}
	return result
}
