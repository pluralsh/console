package client

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func upsertAgentRuntimeAttributes(t *testing.T, attrs console.AgentRuntimeAttributes) map[string]any {
	t.Helper()

	var body []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		body, err = io.ReadAll(r.Body)
		require.NoError(t, err)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"upsertAgentRuntime":{"id":"runtime-id","name":"runtime"}}}`))
	}))
	defer server.Close()

	c := &client{consoleClient: console.NewClient(server.Client(), server.URL, nil)}
	runtime, err := c.UpsertAgentRuntime(context.Background(), attrs)
	require.NoError(t, err)
	assert.Equal(t, "runtime-id", runtime.ID)

	var req struct {
		Variables struct {
			Attributes map[string]any `json:"attributes"`
		} `json:"variables"`
	}
	require.NoError(t, json.Unmarshal(body, &req))
	return req.Variables.Attributes
}

func TestUpsertAgentRuntimeBindings(t *testing.T) {
	base := console.AgentRuntimeAttributes{Name: "runtime", Type: console.AgentRuntimeTypeClaude, AiProxy: lo.ToPtr(true)}

	t.Run("omits createBindings when unset so they are left unchanged", func(t *testing.T) {
		attrs := upsertAgentRuntimeAttributes(t, base)
		assert.NotContains(t, attrs, "createBindings")
		assert.Equal(t, "runtime", attrs["name"])
		assert.Equal(t, true, attrs["aiProxy"])
	})

	t.Run("sends an empty createBindings list so they are cleared", func(t *testing.T) {
		in := base
		in.CreateBindings = []*console.AgentBindingAttributes{}
		attrs := upsertAgentRuntimeAttributes(t, in)
		assert.Contains(t, attrs, "createBindings")
		assert.Empty(t, attrs["createBindings"])
	})

	t.Run("sends configured createBindings", func(t *testing.T) {
		in := base
		in.CreateBindings = []*console.AgentBindingAttributes{{UserEmail: lo.ToPtr("someone@plural.sh")}}
		attrs := upsertAgentRuntimeAttributes(t, in)
		assert.Equal(t, []any{map[string]any{"userEmail": "someone@plural.sh"}}, attrs["createBindings"])
	})
}
