package router

import (
	"testing"

	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/stretchr/testify/require"
)

func TestOpenAIHTTPPolicyFromConfig(t *testing.T) {
	t.Parallel()

	chat := pb.OpenAiMethod_CHAT
	responses := pb.OpenAiMethod_RESPONSES
	auto := pb.OpenAiMethod_AUTO

	tests := []struct {
		name              string
		cfg               *pb.OpenAiConfig
		wantChat          bool
		wantResp          bool
		wantViaChat       bool
		wantViaResponses  bool
	}{
		{
			name:             "nil config allows both",
			cfg:              nil,
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
		{
			name:             "unset method allows both",
			cfg:              &pb.OpenAiConfig{},
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
		{
			name:             "chat only routes responses via chat",
			cfg:              &pb.OpenAiConfig{Method: &chat},
			wantChat:         true,
			wantResp:         false,
			wantViaChat:      true,
			wantViaResponses: false,
		},
		{
			name:             "responses only routes chat via responses",
			cfg:              &pb.OpenAiConfig{Method: &responses},
			wantChat:         false,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: true,
		},
		{
			name:             "auto allows both",
			cfg:              &pb.OpenAiConfig{Method: &auto},
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			policy := openAIHTTPPolicyFromConfig(tt.cfg)
			require.Equal(t, tt.wantChat, policy.allowsRoute(string(RouteChatCompletions)))
			require.Equal(t, tt.wantResp, policy.allowsRoute(string(RouteResponses)))
			require.Equal(t, tt.wantViaChat, policy.responsesViaChat())
			require.Equal(t, tt.wantViaResponses, policy.chatViaResponses())
			require.True(t, policy.allowsRoute(string(RouteEmbeddings)))
		})
	}
}
