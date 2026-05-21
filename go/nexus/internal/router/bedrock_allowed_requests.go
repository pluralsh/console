package router

import (
	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// bedrockAllowedRequests configures Bifrost operation gating when streaming is disabled.
// Returns nil when all operations should remain allowed (default / enableStream unset or true).
func bedrockAllowedRequests(cfg *pb.BedrockConfig) *schemas.AllowedRequests {
	if cfg == nil || cfg.EnableStream == nil || cfg.GetEnableStream() {
		return nil
	}

	return &schemas.AllowedRequests{
		ListModels:           true,
		ChatCompletion:       true,
		ChatCompletionStream: false,
		Responses:            true,
		ResponsesStream:      false,
		Embedding:            true,
	}
}
