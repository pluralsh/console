package v1

import (
	"os"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
)

type SystemPromptTemplateInput struct {
	Mode           console.AgentRunMode
	BrowserEnabled bool
	DindEnabled    bool
}

func systemPromptTemplate(templateFilePath string, input *SystemPromptTemplateInput) (content string, err error) {
	contentBytes, err := os.ReadFile(templateFilePath)
	if err != nil {
		return "", err
	}

	tmpl, err := template.New("systemPromptTemplate").Parse(string(contentBytes))
	if err != nil {
		return "", err
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, input)
	return out.String(), err
}
