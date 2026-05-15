package terraform

import (
	_ "embed"
	"strings"
	"text/template"
)

//go:embed templates/_override.tf.gotmpl
var overrideTemplateText string

type OverrideTemplateInput struct {
	Address       string
	LockAddress   string
	UnlockAddress string
	Actor         string
	DeployToken   string
}

func overrideTemplate(input *OverrideTemplateInput) (fileName, content string, err error) {
	tplName := "_override.tf"
	tmpl, err := template.New(tplName).Parse(overrideTemplateText)
	if err != nil {
		return "", "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)

	return tplName, out.String(), err
}
