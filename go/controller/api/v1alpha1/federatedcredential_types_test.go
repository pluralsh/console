package v1alpha1

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFederatedCredentialAttributesAlwaysSendAud(t *testing.T) {
	tests := []struct {
		name string
		aud  string
		want string
	}{
		{name: "set", aud: "plural", want: "plural"},
		{name: "removed", aud: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fc := FederatedCredential{Spec: FederatedCredentialSpec{Issuer: "https://issuer", Aud: tt.aud}}

			raw, err := json.Marshal(fc.Attributes("user"))
			require.NoError(t, err)

			var body map[string]any
			require.NoError(t, json.Unmarshal(raw, &body))
			assert.Contains(t, body, "aud")
			assert.Equal(t, tt.want, body["aud"])
		})
	}
}
