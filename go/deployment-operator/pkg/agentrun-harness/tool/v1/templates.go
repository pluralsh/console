package v1

import (
	"os"
	"strings"
	"text/template"

	console "github.com/pluralsh/console/go/client"
)

type SystemPromptTemplateInput struct {
	Mode                 console.AgentRunMode
	ReviewDepth          console.AgentReviewDepth
	BrowserEnabled       bool
	DindEnabled          bool
	MemoryEnabled        bool
	WorkDir              string
	RepositoryDir        string
	Prompt               string
	Branch               string
	PRURL                string
	Followup             bool
	PrebakedRepositories []PrebakedRepository
}

type PrebakedRepository struct {
	URL string
	Dir string
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
