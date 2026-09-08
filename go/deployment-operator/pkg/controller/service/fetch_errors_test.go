package service

import (
	"net/http"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/manifests"
	"github.com/stretchr/testify/assert"
)

func TestAgentBootstrappingIsExpectedError(t *testing.T) {
	err := &manifests.HTTPError{StatusCode: http.StatusTooEarly}

	assert.True(t, isExpectedError(err))
}
