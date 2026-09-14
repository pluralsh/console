package cache

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/spf13/pflag"
	"github.com/stretchr/testify/require"
)

func TestExchangeTokenSkipsTLSVerification(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		require.Equal(t, "Bearer token", request.Header.Get("Authorization"))
		_, err := w.Write([]byte("context"))
		require.NoError(t, err)
	}))
	defer server.Close()

	require.NoError(t, pflag.Set("token-exchange-endpoint", server.URL))
	require.NoError(t, pflag.Set("token-exchange-skip-tls-verify", "true"))
	t.Cleanup(func() {
		require.NoError(t, pflag.Set("token-exchange-endpoint", ""))
		require.NoError(t, pflag.Set("token-exchange-skip-tls-verify", "false"))
	})

	context, err := (Key{}).exchangeToken("token")
	require.NoError(t, err)
	require.Equal(t, "context", context)
}
