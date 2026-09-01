package v1

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/prebake"
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
		{"review", "review.md.tmpl"},
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
			if tc.name == "review" {
				for _, expected := range []string{"updateAgentRunAnalysis", "agentPrReview", "getPRState"} {
					if !strings.Contains(content, expected) {
						t.Fatalf("expected review instructions to contain %q", expected)
					}
				}
			}
			if tc.name == "babysit" {
				for _, expected := range []string{
					"human user are always actionable instructions",
					"prioritize them over continuing the initial task",
					"Human comments are tasks",
					"CI flakes are not defects",
					"Do **not** call `createCommit`",
					"transient network/DNS errors",
				} {
					if !strings.Contains(content, expected) {
						t.Fatalf("expected babysit instructions to contain %q", expected)
					}
				}
			}
		})
	}
}

func TestSystemPromptTemplate_ReviewDepth(t *testing.T) {
	templateFile := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system", "review.md.tmpl")

	for _, tc := range []struct {
		depth    console.AgentReviewDepth
		expected string
	}{
		{console.AgentReviewDepthLow, "immediately surrounding functions"},
		{console.AgentReviewDepthMedium, "one dependency hop"},
		{console.AgentReviewDepthHigh, "multiple dependency hops"},
	} {
		content, err := systemPromptTemplate(templateFile, &SystemPromptTemplateInput{
			Mode:          console.AgentRunModeReview,
			ReviewDepth:   tc.depth,
			RepositoryDir: "/work/repo",
			PRURL:         "https://github.com/pluralsh/console/pull/1",
		})
		if err != nil {
			t.Fatalf("systemPromptTemplate() failed for %s: %v", tc.depth, err)
		}
		if !strings.Contains(content, tc.expected) {
			t.Fatalf("expected %s review instructions to contain %q", tc.depth, tc.expected)
		}
		if !strings.Contains(content, "https://github.com/pluralsh/console/pull/1") {
			t.Fatalf("expected %s review instructions to contain the pull request URL", tc.depth)
		}
	}
}

func TestSystemPromptInputIncludesPRURL(t *testing.T) {
	input := (DefaultTool{Config: Config{
		Run: &agentrunv1.AgentRun{
			Mode:  console.AgentRunModeReview,
			PRURL: "https://github.com/pluralsh/console/pull/1",
		},
	}}).systemPromptInput()

	if input.PRURL != "https://github.com/pluralsh/console/pull/1" {
		t.Fatalf("expected pull request URL in system prompt input, got %q", input.PRURL)
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

func TestSystemPromptTemplate_FollowupInstructions(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	content, err := systemPromptTemplate(filepath.Join(templateDir, "write.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		Followup:      true,
		WorkDir:       "/work",
		RepositoryDir: "/work/repo",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() failed: %v", err)
	}
	for _, expected := range []string{
		"existing pull request",
		"Do **not** create or switch to a branch.",
		"Do **not** open another pull request.",
		"Plural MCP `createCommit`",
	} {
		if !strings.Contains(content, expected) {
			t.Fatalf("expected follow-up instructions to contain %q", expected)
		}
	}
}

func TestSystemPromptTemplate_MemoryPersistenceInstructions(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")

	disabled, err := systemPromptTemplate(filepath.Join(templateDir, "write.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		WorkDir:       "/work",
		RepositoryDir: "/work/repo",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() memory disabled failed: %v", err)
	}
	if !strings.Contains(disabled, "Do not pass `persistence: true`") {
		t.Fatal("expected disabled memory prompt to prohibit persistence by default")
	}
	if strings.Contains(disabled, "Runtime memory persistence is enabled") {
		t.Fatal("did not expect enabled memory instructions when MemoryEnabled=false")
	}

	enabled, err := systemPromptTemplate(filepath.Join(templateDir, "write.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		MemoryEnabled: true,
		WorkDir:       "/work",
		RepositoryDir: "/work/repo",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() memory enabled failed: %v", err)
	}
	if !strings.Contains(enabled, "Runtime memory persistence is enabled") {
		t.Fatal("expected enabled memory prompt")
	}
	if !strings.Contains(enabled, "`persistence: true`") {
		t.Fatal("expected enabled memory prompt to request persistent indexing")
	}
}

func TestSystemPromptTemplate_DindInstructions(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")

	for _, tc := range []struct {
		name     string
		template string
	}{
		{"write", "write.md.tmpl"},
		{"babysit", "babysit.md.tmpl"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			content, err := systemPromptTemplate(filepath.Join(templateDir, tc.template), &SystemPromptTemplateInput{
				Mode:          console.AgentRunModeWrite,
				DindEnabled:   true,
				WorkDir:       "/work",
				RepositoryDir: "/work/repo",
			})
			if err != nil {
				t.Fatalf("systemPromptTemplate() failed: %v", err)
			}
			for _, expected := range []string{
				"Kubernetes pod sandbox",
				"may not include many language runtimes",
				"preferred approach",
				"verify compilation",
				"run unit tests",
				"bump dependencies and regenerate lock files",
				"deterministic, reviewable dependency and lock-file updates",
			} {
				if !strings.Contains(content, expected) {
					t.Fatalf("expected DinD instructions to contain %q", expected)
				}
			}
		})
	}
}

func TestSystemPromptTemplate_TemplateFilesExist(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	for _, name := range []string{"analyze.md.tmpl", "write.md.tmpl", "review.md.tmpl", "babysit.md.tmpl"} {
		if _, err := os.Stat(filepath.Join(templateDir, name)); err != nil {
			t.Fatalf("expected template file %q: %v", name, err)
		}
	}
}

func TestSystemPromptTemplate_PrebakedRepositories(t *testing.T) {
	templateDir := filepath.Join("..", "..", "..", "..", "dockerfiles", "agent-harness", "system")
	input := &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		WorkDir:       "/work",
		RepositoryDir: "/work/shared/repository",
		PrebakedRepositories: []PrebakedRepository{
			{URL: "https://github.com/pluralsh/console.git", Dir: "/plural/shared/repos/console"},
			{URL: "https://github.com/pluralsh/plural.git", Dir: "/plural/shared/repos/plural"},
		},
	}

	for _, name := range []string{"analyze.md.tmpl", "write.md.tmpl", "review.md.tmpl", "babysit.md.tmpl"} {
		t.Run(name, func(t *testing.T) {
			content, err := systemPromptTemplate(filepath.Join(templateDir, name), input)
			if err != nil {
				t.Fatalf("systemPromptTemplate() failed: %v", err)
			}
			for _, expected := range []string{
				"## Additional local repositories",
				"You SHOULD inspect them",
				"https://github.com/pluralsh/console.git",
				"/plural/shared/repos/console",
				"https://github.com/pluralsh/plural.git",
				"/plural/shared/repos/plural",
				"Do not clone it again",
			} {
				if !strings.Contains(content, expected) {
					t.Fatalf("expected prebake instructions to contain %q", expected)
				}
			}
			switch name {
			case "analyze.md.tmpl":
				if !strings.Contains(content, "You MAY also read (not modify) the additional local repositories listed above.") {
					t.Fatal("expected analyze scope to allow reading additional local repositories")
				}
				if strings.Contains(content, "Never access files outside this directory.") {
					t.Fatal("analyze scope must not forbid additional local repositories")
				}
			case "review.md.tmpl":
				if !strings.Contains(content, "You MAY also read (not modify) the additional local repositories listed above.") {
					t.Fatal("expected review prompt to allow reading additional local repositories")
				}
			default:
				if !strings.Contains(content, "You MAY read the additional local repositories listed above.") {
					t.Fatal("expected write/babysit prompt to allow reading additional local repositories")
				}
			}
		})
	}

	omitted, err := systemPromptTemplate(filepath.Join(templateDir, "write.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeWrite,
		WorkDir:       "/work",
		RepositoryDir: "/work/shared/repository",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() failed: %v", err)
	}
	if strings.Contains(omitted, "## Additional local repositories") {
		t.Fatal("did not expect prebake section when PrebakedRepositories is empty")
	}

	strict, err := systemPromptTemplate(filepath.Join(templateDir, "analyze.md.tmpl"), &SystemPromptTemplateInput{
		Mode:          console.AgentRunModeAnalyze,
		WorkDir:       "/work",
		RepositoryDir: "/work/shared/repository",
	})
	if err != nil {
		t.Fatalf("systemPromptTemplate() failed: %v", err)
	}
	if !strings.Contains(strict, "Never access files outside this directory.") {
		t.Fatal("expected analyze scope to stay restricted when there are no additional local repositories")
	}
}

func TestExtraPrebakedRepositories_OmitsAssignedRepo(t *testing.T) {
	repos := []prebake.Repository{
		{URL: "https://github.com/octocat/Hello-World.git", Dir: "/plural/shared/repos/hello-world"},
		{URL: "git@" + "github.com" + ":pluralsh/console.git", Dir: "/plural/shared/repos/console"},
	}

	got := extraPrebakedRepositories(repos, "https://github.com/octocat/hello-world")
	if len(got) != 1 {
		t.Fatalf("got %d extra repos, want 1", len(got))
	}
	if got[0].Dir != "/plural/shared/repos/console" {
		t.Fatalf("got extra repo dir %q, want console", got[0].Dir)
	}

	if extra := extraPrebakedRepositories(repos[:1], "https://github.com/octocat/Hello-World.git"); extra != nil {
		t.Fatalf("expected nil when the only prebaked repo is the assigned run, got %#v", extra)
	}

	if extra := extraPrebakedRepositories(nil, "https://github.com/octocat/Hello-World.git"); extra != nil {
		t.Fatalf("expected nil for empty input, got %#v", extra)
	}
}
