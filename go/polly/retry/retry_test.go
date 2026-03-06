package retry

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConstantRetry(t *testing.T) {
	algo := NewConstant(2, 5)
	failer := func() (int, error) { return 0, fmt.Errorf("whoops") }

	_, err := Retry(algo, failer)
	assert.Error(t, err)

	success := func() (int, error) { return 2, nil }
	res, err := Retry(algo, success)
	assert.NoError(t, err)
	assert.Equal(t, res, 2)
}

func TestExponentialRetry(t *testing.T) {
	algo := NewExponential(2, 5, 1.2)
	failer := func() (int, error) { return 0, fmt.Errorf("whoops") }

	_, err := Retry(algo, failer)
	assert.Error(t, err)

	success := func() (int, error) { return 2, nil }
	res, err := Retry(algo, success)
	assert.NoError(t, err)
	assert.Equal(t, res, 2)
}
