package router

import (
	"testing"

	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestBedrockAllowedRequests(t *testing.T) {
	require.Nil(t, bedrockAllowedRequests(nil))
	require.Nil(t, bedrockAllowedRequests(&pb.BedrockConfig{}))
	require.Nil(t, bedrockAllowedRequests(&pb.BedrockConfig{EnableStream: lo.ToPtr(true)}))

	allowed := bedrockAllowedRequests(&pb.BedrockConfig{EnableStream: lo.ToPtr(false)})
	require.NotNil(t, allowed)
	require.True(t, allowed.ChatCompletion)
	require.False(t, allowed.ChatCompletionStream)
	require.True(t, allowed.Responses)
	require.False(t, allowed.ResponsesStream)
}

func TestBedrockNetworkBaseURL(t *testing.T) {
	require.Equal(t, "https://bedrock-proxy.example.com", bedrockNetworkBaseURL("https://bedrock-proxy.example.com/"))
	require.Equal(t, "https://bedrock-proxy.example.com", bedrockNetworkBaseURL("  https://bedrock-proxy.example.com  "))
}
