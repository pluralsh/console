package bedrock

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/document"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/google/uuid"
	ollamaapi "github.com/ollama/ollama/api"
	"github.com/ollama/ollama/openai"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
)

const (
	ChatCompletionObject      = "chat.completion"
	ChatCompletionChunkObject = "chat.completion.chunk"
)

type BedrockProxy struct {
	region        string // might not be necessary but check
	bedrockClient *bedrockruntime.Client
}

func NewBedrockProxy(region string) (api.OpenAIProxy, error) {
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

	input, err := convertOpenAIToBedrockStreamInput(req)
	if err != nil {
		klog.ErrorS(err, "failed to convert bedrock request")
		return
	}

	output, err := b.bedrockClient.ConverseStream(context.Background(), input)
	if err != nil {
		klog.ErrorS(err, "call to bedrock failed")
		return
	}

	for event := range output.GetStream().Events() {
		switch v := event.(type) {
		case *types.ConverseStreamOutputMemberMessageStart:
			chunkResp := openai.ChatCompletionChunk{
				Id:      uuid.NewString(),
				Object:  ChatCompletionChunkObject,
				Created: time.Now().Unix(),
				Model:   req.Model,
				Choices: []openai.ChunkChoice{
					{
						Index: 0,
						Delta: openai.Message{
							Role: string(v.Value.Role),
						},
					},
				},
			}

			payload, _ := json.Marshal(chunkResp)
			_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		case *types.ConverseStreamOutputMemberContentBlockDelta:
			chunkResp := openai.ChatCompletionChunk{
				Id:      uuid.NewString(),
				Object:  ChatCompletionChunkObject,
				Created: time.Now().Unix(),
				Model:   req.Model,
			}

			switch v.Value.Delta.(type) {
			case *types.ContentBlockDeltaMemberText:
				textResponse := v.Value.Delta.(*types.ContentBlockDeltaMemberText)
				chunkResp.Choices = []openai.ChunkChoice{
					{
						Index: 0,
						Delta: openai.Message{
							Role:    "assistant",
							Content: textResponse.Value,
						},
					},
				}
			case *types.ContentBlockDeltaMemberToolUse:
				textResponse := v.Value.Delta.(*types.ContentBlockDeltaMemberToolUse)
				chunkResp.Choices = []openai.ChunkChoice{
					{
						Index: 0,
						Delta: openai.Message{
							Role:    "assistant",
							Content: *textResponse.Value.Input,
						},
					},
				}

			default:
				klog.Infof("unknown content block delta type: %v", v.Value.Delta)
			}

			payload, _ := json.Marshal(chunkResp)
			_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		case *types.UnknownUnionMember:
			klog.Infof("unknown tag: %v", v.Tag)
		default:
			klog.Errorf("Unexpected response type from Bedrock stream: %v", reflect.TypeOf(event))
		}
	}
	// Send OpenAI's `[DONE]` event to signal end of stream
	_, _ = fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

func (b *BedrockProxy) handleNonStreamingBedrock(
	w http.ResponseWriter,
	req *openai.ChatCompletionRequest,
) {

	input, err := convertOpenAIToBedrockInput(req)
	if err != nil {
		klog.ErrorS(err, "failed to convert bedrock request")
		return
	}

	output, err := b.bedrockClient.Converse(context.Background(), input)
	if err != nil {
		klog.ErrorS(err, "call to bedrock failed")
		return
	}

	response, err := convertBedrockToOpenAI(output, req.Model, false)
	if err != nil {
		klog.ErrorS(err, "failed to convert bedrock response to openai format")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		klog.Errorf("Error encoding response: %v", err)
		return
	}
}

func convertMessages(messages []openai.Message) []types.Message {
	var bedrockMessages []types.Message

	for _, msg := range messages {
		var role types.ConversationRole
		if msg.Role == "user" {
			role = types.ConversationRoleUser
		} else {
			continue
		}

		bedrockMessages = append(bedrockMessages, types.Message{
			Role: role,
			Content: []types.ContentBlock{
				&types.ContentBlockMemberText{
					Value: msg.Content.(string),
				},
			},
		})
	}

	return bedrockMessages
}

func convertBedrockToOpenAI(output *bedrockruntime.ConverseOutput, model string, stream bool) (*openai.ChatCompletion, error) {
	response, _ := output.Output.(*types.ConverseOutputMemberMessage)
	responseContentBlock := response.Value.Content[0]
	text, _ := responseContentBlock.(*types.ContentBlockMemberText)

	return &openai.ChatCompletion{
		Id:      uuid.NewString(),
		Model:   model,
		Created: time.Now().Unix(),
		Object:  ChatCompletionObject,
		Choices: []openai.Choice{
			{
				Index: 0,
				Message: openai.Message{
					Role:    string(response.Value.Role),
					Content: text.Value,
				},
			},
		},
	}, nil
}

func convertOpenAIToBedrockInput(openAIReq *openai.ChatCompletionRequest) (*bedrockruntime.ConverseInput, error) {
	bedrockReq := &bedrockruntime.ConverseInput{
		ModelId: aws.String(openAIReq.Model),
	}

	messages, inferenceCfg, toolCfg, err := buildBedrockComponents(openAIReq)
	if err != nil {
		return nil, err
	}

	bedrockReq.Messages = messages
	bedrockReq.InferenceConfig = inferenceCfg

	if len(toolCfg.Tools) > 0 {
		bedrockReq.ToolConfig = toolCfg
	}

	return bedrockReq, nil
}

func convertOpenAIToBedrockStreamInput(openAIReq *openai.ChatCompletionRequest) (*bedrockruntime.ConverseStreamInput, error) {
	bedrockReq := &bedrockruntime.ConverseStreamInput{
		ModelId: aws.String(openAIReq.Model),
	}

	messages, inferenceCfg, toolCfg, err := buildBedrockComponents(openAIReq)
	if err != nil {
		return nil, err
	}

	bedrockReq.Messages = messages
	bedrockReq.InferenceConfig = inferenceCfg

	if len(toolCfg.Tools) > 0 {
		bedrockReq.ToolConfig = toolCfg
	}

	return bedrockReq, nil
}

func buildBedrockComponents(
	openAIReq *openai.ChatCompletionRequest,
) (messages []types.Message,
	inferenceConfig *types.InferenceConfiguration,
	toolConfig *types.ToolConfiguration,
	err error) {

	bedrockMessages := convertMessages(openAIReq.Messages)

	var temp, topP *float32
	var maxTokens *int32
	if openAIReq.Temperature != nil {
		temp = aws.Float32(float32(*openAIReq.Temperature))
	}
	if openAIReq.TopP != nil {
		topP = aws.Float32(float32(*openAIReq.TopP))
	}
	if openAIReq.MaxTokens != nil {
		maxTokens = aws.Int32(int32(*openAIReq.MaxTokens))
	}

	stopSequences, ok := openAIReq.Stop.([]string)
	if !ok {
		stopSequences = []string{}
	}

	inferenceConfig = &types.InferenceConfiguration{
		Temperature:   temp,
		TopP:          topP,
		MaxTokens:     maxTokens,
		StopSequences: stopSequences,
	}

	tConfig := &types.ToolConfiguration{
		ToolChoice: &types.ToolChoiceMemberAuto{
			Value: types.AutoToolChoice{},
		},
	}

	if len(openAIReq.Tools) > 0 {
		var tools []types.Tool
		for _, tool := range openAIReq.Tools {
			schemaMap := buildBedrockToolSchema(tool)
			inputSchemaDoc := document.NewLazyDocument(schemaMap)

			bedrockTool := &types.ToolMemberToolSpec{
				Value: types.ToolSpecification{
					InputSchema: &types.ToolInputSchemaMemberJson{
						Value: inputSchemaDoc,
					},
					Name:        aws.String(tool.Function.Name),
					Description: aws.String(tool.Function.Description),
				},
			}
			tools = append(tools, bedrockTool)
		}
		tConfig.Tools = tools
	}

	return bedrockMessages, inferenceConfig, tConfig, nil
}

func buildBedrockToolSchema(tool ollamaapi.Tool) map[string]interface{} {
	schemaMap := map[string]interface{}{
		"type":     tool.Function.Parameters.Type,
		"required": tool.Function.Parameters.Required,
	}

	propsMap := make(map[string]interface{})
	for fieldName, fieldDef := range tool.Function.Parameters.Properties {
		prop := map[string]interface{}{
			"type":        fieldDef.Type,
			"description": fieldDef.Description,
		}
		if len(fieldDef.Enum) > 0 {
			prop["enum"] = fieldDef.Enum
		}
		propsMap[fieldName] = prop
	}
	schemaMap["properties"] = propsMap
	return schemaMap
}
