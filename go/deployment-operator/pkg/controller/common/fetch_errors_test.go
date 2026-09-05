package common

import (
	"errors"
	"net/http"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/manifests"
	"github.com/stretchr/testify/assert"
)

func TestIsTransientFetchError(t *testing.T) {
	tests := []struct {
		name      string
		err       error
		transient bool
	}{
		{
			name:      "agent unavailable",
			err:       &manifests.HTTPError{StatusCode: http.StatusTooEarly},
			transient: false,
		},
		{
			name:      "rate limited",
			err:       &manifests.HTTPError{StatusCode: http.StatusTooManyRequests},
			transient: true,
		},
		{
			name:      "other client error",
			err:       &manifests.HTTPError{StatusCode: http.StatusBadRequest},
			transient: false,
		},
		{
			name:      "unrelated error",
			err:       errors.New("failed"),
			transient: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.transient, IsTransientFetchError(tt.err))
		})
	}
}
