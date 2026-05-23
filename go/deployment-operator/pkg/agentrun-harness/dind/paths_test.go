package dind

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRepositoryDir(t *testing.T) {
	assert.Equal(t, "/plural/shared/repository", RepositoryDir())
}
