package template

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

const (
	testTplTemplate = "a basic {{ .Template }}"
)

func TestReverse(t *testing.T) {
	res, err := RenderTpl([]byte(testTplTemplate), map[string]interface{}{
		"Template": "template",
	})

	assert.NoError(t, err)
	assert.Equal(t, string(res), "a basic template")
}
