package redistool

import (
	"context"
	"errors"
	"testing"

	"github.com/redis/rueidis"
	"github.com/stretchr/testify/assert"
)

func TestDoReturnsErrorOnFailedEmptySet(t *testing.T) {
	b := RedisSetBuilder[int, int]{
		setErr: errors.New("boom"),
	}

	assert.EqualError(t, b.Do(context.Background()), "boom")
}

func TestDoReturnsErrorOnFailedNonEmptySet(t *testing.T) {
	b := RedisSetBuilder[int, int]{
		setErr: errors.New("boom"),
		cmds:   make([]rueidis.Completed, 1),
	}

	assert.EqualError(t, b.Do(context.Background()), "boom")
}
