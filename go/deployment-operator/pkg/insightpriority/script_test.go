package insightpriority_test

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
)

func TestCompile(t *testing.T) {
	ctx := context.Background()

	t.Run("accepts a script that defines evaluate", func(t *testing.T) {
		require.NoError(t, insightpriority.Compile(ctx, "def evaluate(input):\n    return {}\n"))
	})

	t.Run("rejects a syntax error", func(t *testing.T) {
		err := insightpriority.Compile(ctx, "def evaluate(input:\n    return {}\n")
		require.ErrorIs(t, err, insightpriority.ErrInvalidScript)
	})

	t.Run("rejects a script without evaluate", func(t *testing.T) {
		err := insightpriority.Compile(ctx, "x = 1\n")
		require.ErrorIs(t, err, insightpriority.ErrInvalidScript)
	})

	t.Run("rejects a script that fails while loading", func(t *testing.T) {
		err := insightpriority.Compile(ctx, "raise ValueError('boom')\ndef evaluate(input):\n    return {}\n")
		require.ErrorIs(t, err, insightpriority.ErrInvalidScript)
	})
}

func TestRun(t *testing.T) {
	ctx := context.Background()
	input := map[string]any{"rows": []any{map[string]any{"uid": "a", "ready": 0}, map[string]any{"uid": "b", "ready": 2}}}

	t.Run("calls evaluate with the input", func(t *testing.T) {
		raw, err := insightpriority.Run(ctx, `
def evaluate(input):
    return {r["uid"]: {"priority": "CRITICAL"} for r in input["rows"] if r["ready"] == 0}
`, input)

		require.NoError(t, err)
		assert.JSONEq(t, `{"a": {"priority": "CRITICAL"}}`, string(raw))
	})

	t.Run("accepts an input that is much longer than a line", func(t *testing.T) {
		rows := make([]any, 600)
		for i := range rows {
			rows[i] = map[string]any{"uid": fmt.Sprintf("uid-%d", i), "message": strings.Repeat("x", 100)}
		}

		raw, err := insightpriority.Run(ctx, "def evaluate(input):\n    return {'count': len(input['rows'])}\n", map[string]any{"rows": rows})

		require.NoError(t, err)
		assert.JSONEq(t, `{"count": 600}`, string(raw))
	})

	t.Run("keeps non-ASCII text intact when the input is split into lines", func(t *testing.T) {
		message := strings.Repeat("ł", 1500) // 2 bytes each, so a chunk boundary falls inside a character
		raw, err := insightpriority.Run(ctx, "def evaluate(input):\n    return {'len': len(input['m'])}\n", map[string]any{"m": message})

		require.NoError(t, err)
		assert.JSONEq(t, `{"len": 1500}`, string(raw))
	})

	t.Run("does not repeat the message of an exception", func(t *testing.T) {
		_, err := insightpriority.Run(ctx, "def evaluate(input):\n    raise ValueError('secret-from-another-namespace')\n", input)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "ValueError")
		assert.NotContains(t, err.Error(), "secret-from-another-namespace")
	})

	t.Run("is deterministic", func(t *testing.T) {
		script := "def evaluate(input):\n    return {r['uid']: {'priority': 'LOW'} for r in input['rows']}\n"
		first, err := insightpriority.Run(ctx, script, input)
		require.NoError(t, err)

		for range 5 {
			again, err := insightpriority.Run(ctx, script, input)
			require.NoError(t, err)
			assert.JSONEq(t, string(first), string(again))
		}
	})

	t.Run("returns null for a script that returns nothing", func(t *testing.T) {
		raw, err := insightpriority.Run(ctx, "def evaluate(input):\n    return None\n", input)

		require.NoError(t, err)
		assert.Equal(t, "null", string(raw))
	})

	t.Run("reports an exception without the input", func(t *testing.T) {
		_, err := insightpriority.Run(ctx, "def evaluate(input):\n    return input['rows'][0]['missing']\n", input)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "KeyError")
		assert.NotContains(t, err.Error(), `"uid"`)
	})

	t.Run("stops a script that never ends", func(t *testing.T) {
		cancelled, cancel := context.WithTimeout(ctx, 300_000_000)
		defer cancel()

		_, err := insightpriority.Run(cancelled, "def evaluate(input):\n    while True:\n        pass\n", input)

		require.Error(t, err)
	})

	t.Run("has no access to the host", func(t *testing.T) {
		for name, script := range map[string]string{
			"open":   "def evaluate(input):\n    return open('/etc/passwd').read()\n",
			"os":     "import os\ndef evaluate(input):\n    return os.environ\n",
			"socket": "import socket\ndef evaluate(input):\n    return {}\n",
		} {
			t.Run(name, func(t *testing.T) {
				_, err := insightpriority.Run(ctx, script, input)
				require.Error(t, err)
			})
		}
	})
}

func TestRunJSONShape(t *testing.T) {
	raw, err := insightpriority.Run(context.Background(), "def evaluate(input):\n    return {'a': {'priority': 'HIGH', 'reason': 'because'}}\n", map[string]any{})
	require.NoError(t, err)

	var decoded map[string]map[string]string
	require.NoError(t, json.Unmarshal(raw, &decoded))
	assert.Equal(t, "because", decoded["a"]["reason"])
}
