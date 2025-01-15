package openai

import (
	"encoding/json"
	"time"

	ollamaapi "github.com/ollama/ollama/api"
	"github.com/ollama/ollama/openai"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
)

type Endpoint string

const (
	EndpointChat            = "/openai/chat/completions"
	EndpointChatCompletions = "/v1/chat/completions"
)

type ChatCompletionRequest struct {
	openai.ChatCompletionRequest `json:",inline"`
}

func (in ChatCompletionRequest) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Model    string    `json:"model"`
		Messages []Message `json:"messages"`
		Stream   bool      `json:"stream,omitempty"`
	}{
		Model: in.Model,
		Messages: algorithms.Map(in.Messages, func(m openai.Message) Message {
			return Message{
				Message: m,
			}
		}),
		Stream: in.Stream,
	})
}

type Message struct {
	openai.Message `json:",inline"`
}

func (in Message) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Role    string `json:"role"`
		Content any    `json:"content"`
	}{
		Role:    in.Role,
		Content: in.Content,
	})
}

func ToChatCompletionRequest(in ollamaapi.ChatRequest) ChatCompletionRequest {
	return ChatCompletionRequest{
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: in.Model,
			Messages: algorithms.Map(
				in.Messages,
				func(message ollamaapi.Message) openai.Message {
					return openai.Message{
						Role:    message.Role,
						Content: message.Content,
					}
				}),
			Stream: lo.FromPtr(in.Stream),
		},
	}
}

func FromChatCompletionResponse(in openai.ChatCompletion) ollamaapi.ChatResponse {
	return ollamaapi.ChatResponse{
		Model:     in.Model,
		CreatedAt: time.Unix(in.Created, 0),
		Message:   toFlatMessage(in.Choices),
		Done:      true,
	}
}

func FromErrorResponse(statusCode int) func(response openai.ErrorResponse) ollamaapi.StatusError {
	return func(in openai.ErrorResponse) ollamaapi.StatusError {
		return ollamaapi.StatusError{
			StatusCode:   statusCode,
			Status:       in.Error.Type,
			ErrorMessage: in.Error.Message,
		}
	}
}

func toFlatMessage(choices []openai.Choice) ollamaapi.Message {
	var result ollamaapi.Message
	if len(choices) == 0 {
		return result
	}

	choice := choices[0]
	result.Role = choice.Message.Role
	contentString, _ := choice.Message.Content.(string)
	result.Content = contentString

	return result
}
