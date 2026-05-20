package router

import (
	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// openAIAllowedRequests configures Bifrost operation gating to match deployment openai.method.
// Returns nil when all operations should remain allowed (AUTO / unset).
func openAIAllowedRequests(cfg *pb.OpenAiConfig) *schemas.AllowedRequests {
	if cfg == nil {
		return nil
	}

	switch cfg.GetMethod() {
	case pb.OpenAiMethod_CHAT:
		return &schemas.AllowedRequests{
			ListModels:           true,
			ChatCompletion:       true,
			ChatCompletionStream: true,
			Embedding:            true,
		}
	case pb.OpenAiMethod_RESPONSES:
		return &schemas.AllowedRequests{
			ListModels:        true,
			Responses:         true,
			ResponsesStream:   true,
			Embedding:         true,
		}
	default:
		return nil
	}
}
