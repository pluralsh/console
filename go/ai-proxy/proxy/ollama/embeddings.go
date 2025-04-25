package ollama

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/ollama/ollama/openai"
	"github.com/pluralsh/console/go/ai-proxy/api"
	"github.com/pluralsh/console/go/ai-proxy/api/ollama"
)

type ollamaEmbedRequest struct {
	Model string `json:"model"`
	Input any    `json:"input"`
}

type ollamaEmbedResponse struct {
	Model      string      `json:"model"`
	Embeddings [][]float32 `json:"embeddings"`
}

type OllamaEmbeddingsProxy struct {
	targetUrl url.URL
	client    *http.Client
}

func NewOllamaEmbeddingsProxy(host string) (api.OpenAIProxy, error) {
	parsedURL, err := url.Parse(host)
	if err != nil {
		return nil, err
	}

	client := &http.Client{}

	return &OllamaEmbeddingsProxy{
		targetUrl: *parsedURL,
		client:    client,
	}, nil
}

func (o *OllamaEmbeddingsProxy) Proxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var openAIReq openai.EmbedRequest
		if err := json.NewDecoder(r.Body).Decode(&openAIReq); err != nil {
			http.Error(w, "failed to parse openai request", http.StatusBadRequest)
			return
		}
		o.handleEmbeddingOllama(w, &openAIReq)
	}
}

func (o *OllamaEmbeddingsProxy) handleEmbeddingOllama(
	w http.ResponseWriter,
	req *openai.EmbedRequest,
) {
	input := ollamaEmbedRequest{
		Input: req.Input,
		Model: req.Model,
	}

	targetUrl := o.targetUrl
	targetUrl.Path = ollama.EndpointEmbeddings

	body, err := json.Marshal(input)
	if err != nil {
		http.Error(w, "failed to marshal request body", http.StatusInternalServerError)
		return
	}

	request, err := http.NewRequest(http.MethodPost, targetUrl.String(), bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "failed to create request", http.StatusInternalServerError)
		return
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := o.client.Do(request)
	if err != nil {
		http.Error(w, "failed to send request to ollama service", http.StatusInternalServerError)
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		http.Error(w, "ollama service returned an error", response.StatusCode)
		return
	}

	var ollamaResp ollamaEmbedResponse
	if err := json.NewDecoder(response.Body).Decode(&ollamaResp); err != nil {
		http.Error(w, "failed to decode ollama response", http.StatusInternalServerError)
		return
	}

	data := make([]openai.Embedding, len(ollamaResp.Embeddings))

	for i, row := range ollamaResp.Embeddings {
		data[i] = openai.Embedding{
			Object:    "embedding",
			Embedding: row,
			Index:     i,
		}
	}

	// Convert to OpenAI response format
	openaiResp := openai.EmbeddingList{
		Object: "list",
		Data:   data,
		Model:  ollamaResp.Model,
	}

	// Write the response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(openaiResp)
}
