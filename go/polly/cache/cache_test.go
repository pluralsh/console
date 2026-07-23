package cache

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCacheUsesDynamicExpiryFunc(t *testing.T) {
	fetches := 0
	expiry := time.Hour
	c := NewDynamicCache(func() time.Duration { return expiry }, func(id string) (*string, error) {
		fetches++
		return &id, nil
	})

	initial := "cached"
	c.Add("id", &initial)

	value, err := c.Get("id")
	require.NoError(t, err)
	assert.Equal(t, "cached", *value)
	assert.Equal(t, 0, fetches)

	expiry = 0
	value, err = c.Get("id")
	require.NoError(t, err)
	assert.Equal(t, "id", *value)
	assert.Equal(t, 1, fetches)
}
