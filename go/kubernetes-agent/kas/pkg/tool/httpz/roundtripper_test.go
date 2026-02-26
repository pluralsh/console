package httpz

import (
	"context"
	"crypto/tls"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	_ http.RoundTripper = (*UpgradeRoundTripper)(nil)
)

const (
	requestBodyData = "request_jkasdbfkadsbfkadbfkjasbfkasbdf"

	requestUpgradeBodyData  = "upgrade_request_asdfjkasbfkasdf"
	responseUpgradeBodyData = "upgrade_response_asdfasdfadsf"
)

func TestUpgradeRoundTripper_HappyPath(t *testing.T) {
	var wg sync.WaitGroup
	wg.Wait()
	wg.Add(1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer wg.Done()
		t.Log("SRV: Reading request")
		reqBody, err := io.ReadAll(r.Body)
		if !assert.NoError(t, err) {
			return
		}
		t.Log("SRV: Read request")
		assert.Equal(t, requestBodyData, string(reqBody))
		t.Log("SRV: Writing response")
		w.WriteHeader(http.StatusSwitchingProtocols)
		// 101 does not allow response body
		t.Log("SRV: Wrote response")
		conn, wr, err := w.(http.Hijacker).Hijack()
		if !assert.NoError(t, err) {
			return
		}
		defer func() {
			t.Log("SRV: Closing conn")
			assert.NoError(t, conn.Close())
			t.Log("SRV: Closed conn")
		}()
		connBody := make([]byte, len(requestUpgradeBodyData))
		t.Log("SRV: Reading conn request")
		_, err = io.ReadFull(wr, connBody)
		t.Log("SRV: Read conn request")
		if !assert.NoError(t, err) {
			return
		}
		assert.Equal(t, requestUpgradeBodyData, string(connBody))
		t.Log("SRV: Writing conn response")
		_, err = conn.Write([]byte(responseUpgradeBodyData))
		t.Log("SRV: Wrote conn response")
		if !assert.NoError(t, err) {
			return
		}
	}))
	defer server.Close()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, server.URL, strings.NewReader(requestBodyData))
	require.NoError(t, err)
	rt := UpgradeRoundTripper{
		Dialer:    &net.Dialer{},
		TlsDialer: &tls.Dialer{},
	}
	resp, err := rt.RoundTrip(req)
	require.NoError(t, err)
	defer func() {
		assert.NoError(t, rt.Conn.Close())
	}()

	respData, err := io.ReadAll(resp.Body)
	assert.NoError(t, resp.Body.Close())
	require.NoError(t, err) // check err from ReadAll
	assert.Empty(t, respData)
	require.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)

	_, err = rt.Conn.Write([]byte(requestUpgradeBodyData))
	require.NoError(t, err)

	connBody, err := io.ReadAll(rt.ConnReader)
	require.NoError(t, err)
	assert.Equal(t, responseUpgradeBodyData, string(connBody))
}
