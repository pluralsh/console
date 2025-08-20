package bedrock

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/ollama/ollama/openai"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/ai-proxy/api"
)

const (
	Titan  = "titan"
	Cohere = "cohere"
)

type titanEmbeddingResponse struct {
	Embedding []float32 `json:"embedding"`
}

type cohereEmbeddingResponse struct {
	Embedding []float32 `json:"embeddings"`
}

type BedrockEmbeddingsProxy struct {
	bedrockClient *bedrockruntime.Client
}

func NewBedrockEmbeddingsProxy(credentials []string) (api.OpenAIProxy, error) {
	var region string
	if len(credentials) > 0 {
		region = credentials[0]
	}

	ctx := context.Background()

	var loadOptions []func(options *config.LoadOptions) error
	if region != "" {
		loadOptions = append(loadOptions, config.WithRegion(region))
	}

	sdkConfig, err := config.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		klog.ErrorS(err, "Couldn't load default configuration. Have you set up your AWS account?")
		return nil, err
	}
	bedrockClient := bedrockruntime.NewFromConfig(sdkConfig)
	return &BedrockEmbeddingsProxy{
		bedrockClient: bedrockClient,
	}, nil
}

func (b *BedrockEmbeddingsProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var openAIReq openai.EmbedRequest
		if err := json.NewDecoder(r.Body).Decode(&openAIReq); err != nil {
			http.Error(w, "failed to parse openai request", http.StatusBadRequest)
			return
		}
		b.handleEmbeddingBedrock(w, &openAIReq)
	}
}

func (b *BedrockEmbeddingsProxy) handleEmbeddingBedrock(
	w http.ResponseWriter,
	req *openai.EmbedRequest,
) {
	input := map[string]interface{}{}

	switch {
	case strings.Contains(strings.ToLower(req.Model), Titan):
		input["inputText"] = req.Input
	case strings.Contains(strings.ToLower(req.Model), Cohere):
		input["texts"] = []string{req.Input.(string)}
	default:
		klog.Errorf("model doesn't support embedding at this time %s", req.Model)
		return
	}

	payloadBytes, err := json.Marshal(input)
	if err != nil {
		klog.ErrorS(err, "failed to convert to bedrock request")
		return
	}

	output, err := b.bedrockClient.InvokeModel(context.Background(), &bedrockruntime.InvokeModelInput{
		ModelId: aws.String(req.Model),
		Body:    payloadBytes,
	})
	if err != nil {
		klog.ErrorS(err, "request to bedrock failed")
		return
	}

	response, err := convertBedrockEmbeddingToOpenAI(output, req.Model)
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

func convertBedrockEmbeddingToOpenAI(output *bedrockruntime.InvokeModelOutput, model string) (*openai.EmbeddingList, error) {
	switch {
	case strings.Contains(model, Titan):
		var embed titanEmbeddingResponse
		if err := json.Unmarshal(output.Body, &embed); err != nil {
			return nil, fmt.Errorf("failed to unmarshal Titan embedding response: %v", err)
		}
		var embedding openai.Embedding
		embedding.Embedding = embed.Embedding
		return &openai.EmbeddingList{
			Model: model,
			Data:  []openai.Embedding{embedding},
		}, nil
	case strings.Contains(model, Cohere):
		var embed cohereEmbeddingResponse
		if err := json.Unmarshal(output.Body, &embed); err != nil {
			return nil, fmt.Errorf("failed to unmarshal Cohere embedding response: %v", err)
		}
		var embedding openai.Embedding
		embedding.Embedding = embed.Embedding
		return &openai.EmbeddingList{
			Model: model,
			Data:  []openai.Embedding{embedding},
		}, nil
	default:
		return nil, fmt.Errorf("model doesn't support embedding at this time %s", model)
	}
}
