package openaiproxy

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/openai/openai-go"
)

func TestStreamChunksFromCompletionEmitsSingleContentChunk(t *testing.T) {
	t.Parallel()

	content := strings.Repeat("a", 100)
	chunks, err := StreamChunksFromCompletion(openai.ChatCompletion{
		ID:      "chatcmpl-chunk",
		Created: 10,
		Model:   "gpt-4",
		Choices: []openai.ChatCompletionChoice{{
			Index: 0,
			Message: openai.ChatCompletionMessage{
				Role:    "assistant",
				Content: content,
			},
			FinishReason: "stop",
		}},
	})
	if err != nil {
		t.Fatalf("StreamChunksFromCompletion() failed: %v", err)
	}

	contentChunks := 0
	var streamed strings.Builder
	for _, chunk := range chunks {
		if len(chunk.Choices) == 0 || chunk.Choices[0].Delta.Content == "" {
			continue
		}
		contentChunks++
		streamed.WriteString(chunk.Choices[0].Delta.Content)
	}

	if contentChunks != 1 {
		t.Fatalf("content chunk count = %d, want 1", contentChunks)
	}
	if streamed.String() != content {
		t.Fatalf("streamed content length = %d, want %d", len(streamed.String()), len(content))
	}
}

func TestStreamChunksFromCompletionUsageChunk(t *testing.T) {
	t.Parallel()

	chunks, err := StreamChunksFromCompletion(openai.ChatCompletion{
		ID:      "chatcmpl-usage",
		Created: 10,
		Model:   "gpt-4",
		Choices: []openai.ChatCompletionChoice{{
			Index: 0,
			Message: openai.ChatCompletionMessage{
				Role:    "assistant",
				Content: "hi",
			},
			FinishReason: "stop",
		}},
		Usage: openai.CompletionUsage{
			PromptTokens:     5,
			CompletionTokens: 2,
			TotalTokens:      7,
		},
	})
	if err != nil {
		t.Fatalf("StreamChunksFromCompletion() failed: %v", err)
	}

	usageChunk := chunks[len(chunks)-1]
	if usageChunk.Usage.TotalTokens != 7 {
		t.Fatalf("usage total_tokens = %d, want 7", usageChunk.Usage.TotalTokens)
	}
	if len(usageChunk.Choices) != 0 {
		t.Fatalf("usage chunk choices = %#v, want empty slice", usageChunk.Choices)
	}

	payload, err := json.Marshal(usageChunk)
	if err != nil {
		t.Fatalf("marshal usage chunk: %v", err)
	}
	if !strings.Contains(string(payload), `"choices":[]`) {
		t.Fatalf("expected choices:[], got %s", payload)
	}
}

func TestWriteSSE(t *testing.T) {
	t.Parallel()

	var buf bytes.Buffer
	err := WriteSSE(&buf, []openai.ChatCompletionChunk{{
		ID:      "chatcmpl-1",
		Object:  "chat.completion.chunk",
		Created: 1,
		Model:   "gpt-4",
		Choices: []openai.ChatCompletionChunkChoice{{
			Index:        0,
			Delta:        openai.ChatCompletionChunkChoiceDelta{Content: "hi"},
			FinishReason: "stop",
		}},
	}})
	if err != nil {
		t.Fatalf("WriteSSE() failed: %v", err)
	}

	output := buf.String()
	if !strings.Contains(output, "data: ") {
		t.Fatalf("expected SSE data lines, got %q", output)
	}
	if !strings.Contains(output, "data: [DONE]") {
		t.Fatalf("expected DONE marker, got %q", output)
	}

	var payload openai.ChatCompletionChunk
	for _, line := range strings.Split(output, "\n") {
		if !strings.HasPrefix(line, "data: ") || strings.HasSuffix(line, "[DONE]") {
			continue
		}
		if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &payload); err == nil {
			break
		}
	}
	if payload.ID != "chatcmpl-1" {
		t.Fatalf("chunk id = %q, want chatcmpl-1", payload.ID)
	}
}
