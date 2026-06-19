package openaiproxy

import (
	"encoding/json"
	"fmt"
	"io"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/shared/constant"
)

// StreamChunksFromCompletion converts a non-streaming chat completion into OpenAI SSE chunk payloads.
func StreamChunksFromCompletion(completion openai.ChatCompletion) ([]openai.ChatCompletionChunk, error) {
	if len(completion.Choices) == 0 {
		return nil, fmt.Errorf("completion has no choices")
	}

	base := chunkBase(completion)
	var chunks []openai.ChatCompletionChunk

	for _, choice := range completion.Choices {
		chunks = append(chunks, roleChunk(base, choice))

		if choice.Message.Content != "" {
			chunks = append(chunks, withChoiceDelta(base, choice.Index, openai.ChatCompletionChunkChoiceDelta{
				Content: choice.Message.Content,
			}))
		}

		if choice.Message.Refusal != "" {
			chunks = append(chunks, withChoiceDelta(base, choice.Index, openai.ChatCompletionChunkChoiceDelta{
				Refusal: choice.Message.Refusal,
			}))
		}

		for i, call := range choice.Message.ToolCalls {
			chunks = append(chunks, withChoiceDelta(base, choice.Index, openai.ChatCompletionChunkChoiceDelta{
				ToolCalls: []openai.ChatCompletionChunkChoiceDeltaToolCall{{
					Index: int64(i),
					ID:    call.ID,
					Type:  string(call.Type),
					Function: openai.ChatCompletionChunkChoiceDeltaToolCallFunction{
						Name:      call.Function.Name,
						Arguments: call.Function.Arguments,
					},
				}},
			}))
		}

		chunks = append(chunks, finishChunk(base, choice))
	}

	if completion.Usage.TotalTokens > 0 || completion.Usage.PromptTokens > 0 || completion.Usage.CompletionTokens > 0 {
		usageChunk := base
		usageChunk.Choices = []openai.ChatCompletionChunkChoice{}
		usageChunk.Usage = completion.Usage
		chunks = append(chunks, usageChunk)
	}

	return chunks, nil
}

func roleChunk(base openai.ChatCompletionChunk, choice openai.ChatCompletionChoice) openai.ChatCompletionChunk {
	return withChoiceDelta(base, choice.Index, openai.ChatCompletionChunkChoiceDelta{
		Role: messageRole(choice),
	})
}

func messageRole(choice openai.ChatCompletionChoice) string {
	role := string(choice.Message.Role)
	if role == "" {
		return "assistant"
	}
	return role
}

func chunkBase(completion openai.ChatCompletion) openai.ChatCompletionChunk {
	return openai.ChatCompletionChunk{
		ID:                completion.ID,
		Object:            constant.ChatCompletionChunk("chat.completion.chunk"),
		Created:           completion.Created,
		Model:             completion.Model,
		SystemFingerprint: completion.SystemFingerprint,
		ServiceTier:       openai.ChatCompletionChunkServiceTier(completion.ServiceTier),
	}
}

func finishChunk(base openai.ChatCompletionChunk, choice openai.ChatCompletionChoice) openai.ChatCompletionChunk {
	return openai.ChatCompletionChunk{
		ID:                base.ID,
		Object:            base.Object,
		Created:           base.Created,
		Model:             base.Model,
		SystemFingerprint: base.SystemFingerprint,
		ServiceTier:       base.ServiceTier,
		Choices: []openai.ChatCompletionChunkChoice{{
			Index:        choice.Index,
			Delta:        openai.ChatCompletionChunkChoiceDelta{},
			FinishReason: choice.FinishReason,
		}},
	}
}

func withChoiceDelta(base openai.ChatCompletionChunk, index int64, delta openai.ChatCompletionChunkChoiceDelta) openai.ChatCompletionChunk {
	return openai.ChatCompletionChunk{
		ID:                base.ID,
		Object:            base.Object,
		Created:           base.Created,
		Model:             base.Model,
		SystemFingerprint: base.SystemFingerprint,
		ServiceTier:       base.ServiceTier,
		Choices: []openai.ChatCompletionChunkChoice{{
			Index: index,
			Delta: delta,
		}},
	}
}

// WriteSSE writes OpenAI-compatible SSE events for the given chunks.
func WriteSSE(w io.Writer, chunks []openai.ChatCompletionChunk) error {
	for _, chunk := range chunks {
		payload, err := json.Marshal(chunk)
		if err != nil {
			return fmt.Errorf("marshal stream chunk: %w", err)
		}
		if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
			return err
		}
	}

	if _, err := io.WriteString(w, "data: [DONE]\n\n"); err != nil {
		return err
	}

	return nil
}

func forceNonStreaming(body []byte) ([]byte, error) {
	var params openai.ChatCompletionNewParams
	if err := json.Unmarshal(body, &params); err != nil {
		return nil, err
	}

	params.StreamOptions = openai.ChatCompletionStreamOptionsParam{}

	return json.Marshal(params)
}

func streamingRequested(body []byte) (bool, error) {
	var req struct {
		Stream *bool `json:"stream"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		return false, err
	}

	return req.Stream != nil && *req.Stream, nil
}
