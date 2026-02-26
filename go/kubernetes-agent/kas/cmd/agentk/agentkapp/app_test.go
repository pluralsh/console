package agentkapp

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseHeaders(t *testing.T) {
	input := []string{
		"x-custom-header-1:value1",
		"x-custom-header-2: value2",
		"x-custom-header-2 : value3",
		" x-custom-header-3: value 4 ",
	}
	expected := http.Header{
		"X-Custom-Header-1": []string{"value1"},
		"X-Custom-Header-2": []string{"value2", "value3"},
		"X-Custom-Header-3": []string{"value 4"},
	}
	h, err := parseHeaders(input)
	require.NoError(t, err)
	assert.Equal(t, expected, h)
}
