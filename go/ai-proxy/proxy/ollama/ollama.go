package ollama

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"
	ollamaapi "github.com/ollama/ollama/api"
	"github.com/ollama/ollama/openai"
	"github.com/pluralsh/console/go/ai-proxy/api"
	"k8s.io/klog/v2"
)

const (
	ChatCompletionObject      = "chat.completion"
	ChatCompletionChunkObject = "chat.completion.chunk"
)

type OllamaProxy struct {
	ollamaClient *ollamaapi.Client
	api.OpenAIProxy
}

func NewOllamaProxy(host string) (api.OpenAIProxy, error) {
	parsedUrl, err := url.Parse(host)
	if err != nil {
		return nil, err
	}
	ollamaClient := ollamaapi.NewClient(parsedUrl, http.DefaultClient)
	return &OllamaProxy{ollamaClient: ollamaClient}, nil
}

func (o *OllamaProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var openAIReq openai.ChatCompletionRequest
		if err := json.NewDecoder(r.Body).Decode(&openAIReq); err != nil {
			http.Error(w, "failed to parse openai request", http.StatusBadRequest)
			return
		}

		if openAIReq.Stream {
			o.handleStreamingOllama(w, &openAIReq)
		} else {
			o.handleNonStreamingOllama(w, &openAIReq)
		}
	}
}

func (o *OllamaProxy) handleStreamingOllama(
	w http.ResponseWriter,
	req *openai.ChatCompletionRequest,
) {
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		klog.Error("Streaming not supported by server")
		return
	}

	input, err := convertOpenAIToOllamaChatRequest(req)
	if err != nil {
		klog.ErrorS(err, "failed to convert ollama request")
		return
	}

	respFunc := func(resp ollamaapi.ChatResponse) error {
		chunk := openai.ChunkChoice{}
		var finishReason *string

		// Process any tool calls in the response
		if len(resp.Message.ToolCalls) > 0 {
			var toolCalls []openai.ToolCall
			for i, tc := range resp.Message.ToolCalls {
				// Convert the map back to a JSON string for arguments
				argBytes, err := json.Marshal(tc.Function.Arguments)
				if err != nil {
					return err
				}

				toolCalls = append(toolCalls, openai.ToolCall{
					ID:    uuid.NewString(),
					Index: i,
					Type:  "function",
					Function: struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					}{
						Name:      tc.Function.Name,
						Arguments: string(argBytes),
					},
				})
			}
			chunk.Delta.ToolCalls = toolCalls
			reason := "tool_calls"
			finishReason = &reason
		} else {
			chunk.Delta.Role = "assistant"
			chunk.Delta.Content = resp.Message.Content
		}

		completionChunk := openai.ChatCompletionChunk{
			Id:      uuid.NewString(),
			Object:  ChatCompletionChunkObject,
			Created: time.Now().Unix(),
			Model:   req.Model,
			Choices: []openai.ChunkChoice{
				{
					Index:        0,
					Delta:        chunk.Delta,
					FinishReason: finishReason,
				},
			},
		}

		payload, err := json.Marshal(completionChunk)
		if err != nil {
			return err
		}

		_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
		flusher.Flush()
		return nil
	}

	err = o.ollamaClient.Chat(context.Background(), input, respFunc)
	if err != nil {
		klog.ErrorS(err, "failed to stream ollama response")
		return
	}

	// Send OpenAI's `[DONE]` event to signal end of stream
	_, _ = fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

func (o *OllamaProxy) handleNonStreamingOllama(
	w http.ResponseWriter,
	req *openai.ChatCompletionRequest,
) {
	input, err := convertOpenAIToOllamaChatRequest(req)
	if err != nil {
		klog.ErrorS(err, "failed to convert ollama request")
		return
	}

	var ollamaResponse ollamaapi.ChatResponse
	respFunc := func(output ollamaapi.ChatResponse) error {
		ollamaResponse = output
		return nil
	}

	err = o.ollamaClient.Chat(context.Background(), input, respFunc)
	if err != nil {
		klog.ErrorS(err, "failed to get ollama response")
		return
	}

	response := openai.ChatCompletion{
		Id:      uuid.NewString(),
		Object:  ChatCompletionObject,
		Created: time.Now().Unix(),
		Model:   req.Model,
		Choices: []openai.Choice{
			{
				Index: 0,
				Message: func() openai.Message {
					message := openai.Message{
						Role:    "assistant",
						Content: ollamaResponse.Message.Content,
					}

					// Add tool calls if present
					if len(ollamaResponse.Message.ToolCalls) > 0 {
						var toolCalls []openai.ToolCall
						for _, tc := range ollamaResponse.Message.ToolCalls {
							// Convert the map back to a JSON string for arguments
							argBytes, err := json.Marshal(tc.Function.Arguments)
							if err != nil {
								klog.ErrorS(err, "failed to marshal tool call arguments")
								continue
							}

							toolCalls = append(toolCalls, openai.ToolCall{
								Function: struct {
									Name      string `json:"name"`
									Arguments string `json:"arguments"`
								}{
									Name:      tc.Function.Name,
									Arguments: string(argBytes),
								},
							})
						}
						message.ToolCalls = toolCalls
					}

					return message
				}(),
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		klog.Errorf("Error encoding response: %v", err)
		return
	}

}

func convertOpenAIToOllamaChatRequest(req *openai.ChatCompletionRequest) (*ollamaapi.ChatRequest, error) {
	var messages []ollamaapi.Message
	for _, i := range req.Messages {
		var toolCalls []ollamaapi.ToolCall
		for _, tc := range i.ToolCalls {
			var argsMap map[string]interface{}
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &argsMap); err != nil {
				return nil, err
			}

			toolCalls = append(toolCalls, ollamaapi.ToolCall{
				Function: ollamaapi.ToolCallFunction{
					Name:      tc.Function.Name,
					Arguments: argsMap,
				},
			})
		}

		messages = append(messages, ollamaapi.Message{
			Role:      i.Role,
			Content:   i.Content.(string),
			ToolCalls: toolCalls,
		})
	}

	return &ollamaapi.ChatRequest{
		Model:    req.Model,
		Messages: messages,
		Stream:   &req.Stream,
		Tools:    req.Tools,
	}, nil
}
