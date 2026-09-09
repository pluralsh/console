package gemini

import (
	"context"
	"errors"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
	console "github.com/pluralsh/console/go/client"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
)

func TestTransportLaunchUsesACPAndGeminiEnvironment(t *testing.T) {
	binDir := t.TempDir()
	output := filepath.Join(t.TempDir(), "launch")
	writeGeminiBinary(t, binDir)
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("GEMINI_TEST_OUTPUT", output)
	endpoint := "https://api.example"
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: geminiTestRun(console.AgentRunModeWrite, "gemini-custom", &endpoint)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	var preStarts, postStarts atomic.Int32
	process, err := transport.launch([]exec.Option{
		exec.WithHook(stackv1.LifecyclePreStart, func() error {
			preStarts.Add(1)
			return nil
		}),
		exec.WithHook(stackv1.LifecyclePostStart, func() error {
			postStarts.Add(1)
			return nil
		}),
	}, console.AgentRunModeWrite, "gemini-custom")
	if err != nil {
		t.Fatal(err)
	}
	go io.Copy(io.Discard, process.Stdout)
	go io.Copy(io.Discard, process.Stderr)
	if err := process.Wait(); err != nil {
		t.Fatal(err)
	}
	if preStarts.Load() != 1 || postStarts.Load() != 1 {
		t.Fatalf("hooks = %d/%d", preStarts.Load(), postStarts.Load())
	}
	content, err := os.ReadFile(output)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"args=--acp --model gemini-custom --approval-mode=yolo", "key=api-key", "endpoint=https://api.example", "trust=true", "home=" + config.WorkDir, "cwd=" + transport.workDir} {
		if !strings.Contains(string(content), want) {
			t.Fatalf("launch missing %q: %s", want, content)
		}
	}
}

func TestTransportCapabilitiesAndPreCancelledTurn(t *testing.T) {
	config := toolv1.Config{WorkDir: t.TempDir(), RepositoryDir: t.TempDir(), Run: geminiTestRun(console.AgentRunModeWrite, "", nil)}
	transport, err := NewTransport(NewAgent(config))
	if err != nil {
		t.Fatal(err)
	}
	if transport.Kind() != toolv1.TransportKindACP || transport.Capabilities().ToolCallOutputStreaming ||
		!transport.Capabilities().FileSystemWrite {
		t.Fatalf("transport = %#v", transport.Capabilities())
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = transport.Turn(ctx, toolv1.TurnRequest{}, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Turn() error = %v", err)
	}
}

func TestGeminiPromptUsageReadsQuotaTokenCount(t *testing.T) {
	usage := geminiPromptUsage(acpsdk.PromptResponse{Meta: map[string]any{
		"quota": map[string]any{"token_count": map[string]any{
			"input_tokens": float64(17), "output_tokens": float64(9),
		}},
	}})
	if usage == nil || usage.InputTokens != 17 || usage.OutputTokens != 9 || usage.TotalTokens != 26 {
		t.Fatalf("usage = %#v", usage)
	}
	if usage := geminiPromptUsage(acpsdk.PromptResponse{Meta: map[string]any{"quota": map[string]any{"token_count": map[string]any{
		"input_tokens": float64(17.5), "output_tokens": float64(9),
	}}}}); usage != nil {
		t.Fatalf("usage = %#v, want nil", usage)
	}
	if _, ok := geminiTokenCount(math.Ldexp(1, strconv.IntSize-1)); ok {
		t.Fatal("geminiTokenCount() overflow was accepted")
	}
}

func TestGeminiPromptUsagePrefersStandardUsage(t *testing.T) {
	standard := &acpsdk.Usage{InputTokens: 8, OutputTokens: 3, TotalTokens: 11}
	usage := geminiPromptUsage(acpsdk.PromptResponse{
		Usage: standard,
		Meta: map[string]any{"quota": map[string]any{"token_count": map[string]any{
			"input_tokens": float64(17), "output_tokens": float64(9),
		}}},
	})
	if usage != standard {
		t.Fatalf("usage = %#v, want standard %#v", usage, standard)
	}
}

func writeGeminiBinary(t *testing.T, binDir string) {
	t.Helper()
	script := "#!/bin/sh\n" +
		"printf 'args=%s\\nkey=%s\\nendpoint=%s\\ntrust=%s\\nhome=%s\\ncwd=%s\\n' \"$*\" \"$GEMINI_API_KEY\" \"$GEMINI_API_BASE_URL\" \"$GEMINI_CLI_TRUST_WORKSPACE\" \"$GEMINI_CLI_HOME\" \"$PWD\" > \"$GEMINI_TEST_OUTPUT\"\n"
	if err := os.WriteFile(filepath.Join(binDir, geminiBinary), []byte(script), 0755); err != nil {
		t.Fatal(err)
	}
}
