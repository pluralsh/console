package v1

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestSystemPromptTemplate_EmbedsOriginalPrompt(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	prompt := "Fix the flaky login test in auth/session_test.go"

	for _, tc := range []struct {
		name     string
		template string
	}{
		{"analyze", "analyze.md.tmpl"},
		{"write", "write.md.tmpl"},
		{"babysit", "babysit.md.tmpl"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			content, err := systemPromptTemplate(filepath.Join(templateDir, tc.template), &SystemPromptTemplateInput{
				Mode:          console.AgentRunModeWrite,
				WorkDir:       "/work",
				RepositoryDir: "/work/repo",
				Prompt:        prompt,
			})
			if err != nil {
				t.Fatalf("systemPromptTemplate() failed: %v", err)
			}
			if !strings.Contains(content, "## Original task") {
				t.Fatal("expected Original task section in rendered system prompt")
			}
			if !strings.Contains(content, prompt) {
				t.Fatalf("expected original prompt %q in rendered system prompt", prompt)
			}
			if tc.name == "analyze" && !strings.Contains(content, "updateAgentRunAnalysis") {
				t.Fatal("expected updateAgentRunAnalysis in analyze system prompt")
			}
		})
	}
}

func TestSystemPromptTemplate_OmitsOriginalTaskWhenPromptEmpty(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	content, err := systemPromptTemplate(filepath.Join(templateDir, "write.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		WorkDir:       "/work",
		RepositoryDir: "/work/repo",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() failed: %v", err)
	}
	if strings.Contains(content, "## Original task") {
		t.Fatal("did not expect Original task section when prompt is empty")
	}
}

func TestSystemPromptTemplate_TemplateFilesExist(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	for _, name := range []string{"analyze.md.tmpl", "write.md.tmpl", "babysit.md.tmpl"} {
		if _, err := os.Stat(filepath.Join(templateDir, name)); err != nil {
			t.Fatalf("expected template file %q: %v", name, err)
		}
	}
}

func TestSystemPromptTemplate_BrowserBlockIsGated(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	templates := []string{"write.md.tmpl", "babysit.md.tmpl", "analyze.md.tmpl"}

	for _, name := range templates {
		t.Run(name+"/disabled", func(t *testing.T) {
			content, err := systemPromptTemplate(filepath.Join(templateDir, name), &SystemPromptTemplateInput{
				Mode:           console.AgentRunModeWrite,
				WorkDir:        "/work",
				RepositoryDir:  "/work/repo",
				BrowserEnabled: false,
			})
			if err != nil {
				t.Fatalf("systemPromptTemplate() failed: %v", err)
			}
			if strings.Contains(content, "mcp__browser__") {
				t.Errorf("did not expect browser MCP instructions when BrowserEnabled=false, in %s", name)
			}
		})

		t.Run(name+"/enabled", func(t *testing.T) {
			content, err := systemPromptTemplate(filepath.Join(templateDir, name), &SystemPromptTemplateInput{
				Mode:           console.AgentRunModeWrite,
				WorkDir:        "/work",
				RepositoryDir:  "/work/repo",
				BrowserEnabled: true,
			})
			if err != nil {
				t.Fatalf("systemPromptTemplate() failed: %v", err)
			}
			if !strings.Contains(content, "mcp__browser__") {
				t.Errorf("expected browser MCP instructions when BrowserEnabled=true, in %s", name)
			}
		})
	}
}
