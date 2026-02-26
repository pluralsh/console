package grpctool

import (
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetRequestMetadata(t *testing.T) {
	header := http.Header{}
	header.Add("X-Custom-Header-1", "value1")
	header.Add("X-Custom-Header-2", "value2")
	header.Add("X-Custom-Header-2", "value3")
	meta := NewHeaderMetadata(header, true)
	expected := map[string]string{
		"X-Custom-Header-1": "value1",
		"X-Custom-Header-2": "value2,value3",
	}
	result, err := meta.GetRequestMetadata(context.Background(), "asdf")
	require.NoError(t, err)
	assert.Equal(t, result, expected)
}

func TestRequireTransportSecurity(t *testing.T) {
	meta := NewHeaderMetadata(http.Header{}, false)
	assert.True(t, meta.RequireTransportSecurity())

	meta = NewHeaderMetadata(http.Header{}, true)
	assert.False(t, meta.RequireTransportSecurity())
}
