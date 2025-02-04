package bedrock

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/google/uuid"
	"github.com/ollama/ollama/openai"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
)

const (
	anthropicClaude = "anthropic.claude-v2"
)

type BedrockProxy struct {
	region        string // might not be necessary but check
	bedrockClient *bedrockruntime.Client
}

func NewBedrockProxy(region string) (api.BedrockAIProxy, error) {
	ctx := context.Background()
	sdkConfig, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		klog.ErrorS(err, "Couldn't load default configuration. Have you set up your AWS account?")
		return nil, err
	}
	bedrockClient := bedrockruntime.NewFromConfig(sdkConfig)
	return &BedrockProxy{
		bedrockClient: bedrockClient,
		region:        region,
	}, nil
}

func (b *BedrockProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var openAIReq openai.ChatCompletionRequest
		if err := json.NewDecoder(r.Body).Decode(&openAIReq); err != nil {
			klog.ErrorS(err, "failed to parse openai request")
			return
		}

		if openAIReq.Stream {
			b.handleStreamingBedrock(w, &openAIReq)
		} else {
			b.handleNonStreamingBedrock(w, &openAIReq)
		}
	}
}

type ClaudeRequest struct {
	Prompt            string   `json:"prompt"`
	MaxTokensToSample int      `json:"max_tokens_to_sample"`
	Temperature       float64  `json:"temperature,omitempty"`
	TopP              float64  `json:"top_p,omitempty"`
	TopK              int      `json:"top_k,omitempty"`
	StopSequences     []string `json:"stop_sequences,omitempty"`
}

type ClaudeResponse struct {
	Completion string `json:"completion"`
}

func (b *BedrockProxy) handleStreamingBedrock(
	w http.ResponseWriter,
	req *openai.ChatCompletionRequest,
) {
	// Set up streaming headers (SSE)
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		klog.Error("Streaming not supported by server")
		return
	}

	var output *bedrockruntime.InvokeModelWithResponseStreamOutput

	switch {
	case strings.Contains(req.Model, anthropicClaude):
		input, err := toClaudeChatRequest(req)
		if err != nil {
			klog.ErrorS(err, "failed to convert bedrock request")
			return
		}

		body, err := json.Marshal(input)
		if err != nil {
			klog.ErrorS(err, "failed to marshal bedrock request")
			return
		}

		output, err = b.bedrockClient.InvokeModelWithResponseStream(context.Background(), &bedrockruntime.InvokeModelWithResponseStreamInput{
			Body:        body,
			ModelId:     aws.String(req.Model),
			ContentType: aws.String("application/json"),
		})

		if err != nil {
			klog.ErrorS(err, "Bedrock invoke error: "+err.Error())
			return
		}

	default:
		fmt.Errorf("invalid model: %s", req.Model)
		return
	}

	for event := range output.GetStream().Events() {
		switch v := event.(type) {
		case *types.ResponseStreamMemberChunk:
			var resp ClaudeResponse
			err := json.NewDecoder(bytes.NewReader(v.Value.Bytes)).Decode(&resp)
			if err != nil {
				log.Printf("Error decoding response chunk: %v", err)
				continue
			}

			chunkResp := openai.ChatCompletion{
				Id:      uuid.NewString(),
				Created: time.Now().Unix(),
				Model:   req.Model,
				Choices: []openai.Choice{
					{
						Index: 0,
						Message: openai.Message{
							Role:    "assistant",
							Content: resp.Completion,
						},
					},
				},
			}

			payload, _ := json.Marshal(chunkResp)
			fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()

		case *types.UnknownUnionMember:
			log.Println("Unknown streaming response:", v.Tag)

		default:
			log.Println("Unexpected response type from Bedrock stream")
		}
	}

	// Send OpenAI's `[DONE]` event to signal end of stream
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

func (b *BedrockProxy) handleNonStreamingBedrock(
	w http.ResponseWriter,
	req *openai.ChatCompletionRequest,
) {

	var text string

	switch {
	case strings.Contains(req.Model, anthropicClaude):
		input, err := toClaudeChatRequest(req)
		if err != nil {
			klog.ErrorS(err, "failed to convert bedrock request")
			return
		}

		output, err := b.chatCompletions(input, req.Model)
		if err != nil {
			klog.ErrorS(err, "call to bedrock failed")
			return
		}

		var response ClaudeResponse
		if err := json.Unmarshal(output.Body, &response); err != nil {
			klog.Fatal("failed to unmarshal", err)
		}

		text = response.Completion

	default:
		fmt.Errorf("invalid model: %s", req.Model)
		return
	}

	response := openai.ChatCompletion{
		Id:      uuid.NewString(),
		Created: time.Now().Unix(),
		Model:   req.Model,
		Choices: []openai.Choice{
			{
				Index: 0,
				Message: openai.Message{
					Role:    "assistant",
					Content: text,
				},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (b *BedrockProxy) chatCompletions(prompt interface{}, model string) (*bedrockruntime.InvokeModelOutput, error) {
	body, err := json.Marshal(prompt)
	if err != nil {
		return nil, err
	}

	invokeInput := &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(model),
		ContentType: aws.String("application/json"),
		Body:        body,
	}

	output, err := b.bedrockClient.InvokeModel(context.Background(), invokeInput)
	if err != nil {
		return nil, fmt.Errorf("bedrock invoke error: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to invoke bedrock")
	}

	return output, nil
}

func toClaudeChatRequest(req *openai.ChatCompletionRequest) (ClaudeRequest, error) {
	prompt := formatClaudePrompt(req.Messages)

	claudeReq := ClaudeRequest{
		Prompt:            prompt,
		MaxTokensToSample: *req.MaxTokens,
		Temperature:       *req.Temperature,
		TopP:              *req.TopP,
		StopSequences:     []string{"\n\nHuman:"},
	}

	return claudeReq, nil
}

func formatClaudePrompt(messages []openai.Message) string {
	var sb strings.Builder

	for _, msg := range messages {
		switch msg.Role {
		case "system":
			sb.WriteString(fmt.Sprintf("[System message: %s]\n", msg.Content)) // Claude doesn’t officially support system messages
		case "user":
			sb.WriteString(fmt.Sprintf("\n\nHuman: %s", msg.Content))
		case "assistant":
			sb.WriteString(fmt.Sprintf("\n\nAssistant: %s", msg.Content))
		}
	}

	sb.WriteString("\n\nAssistant:") // Ensure the prompt ends with `Assistant:` for Claude's expected format
	return sb.String()
}
