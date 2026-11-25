package router

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// Nexus must start before AI is configured in Console.
func TestNewHandler_AIDisabled(t *testing.T) {
	require.NoError(t, log.Init("error"))

	h, err := NewHandler(&mockConsoleClient{cfg: &pb.AiConfig{Enabled: false}})
	require.NoError(t, err)
	require.NotNil(t, h)
}
