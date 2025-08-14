package webhooks

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"testing"
)

func TestParseWebhook(t *testing.T) {
	secret := []byte("test-secret")
	body := []byte("test-body")

	h := hmac.New(sha256.New, secret)
	h.Write(body)
	signature := "sha256=" + hex.EncodeToString(h.Sum(nil))

	tests := []struct {
		name      string
		signature string
		body      []byte
		wantErr   bool
	}{
		{
			name:      "valid signature",
			signature: signature,
			body:      body,
			wantErr:   false,
		},
		{
			name:      "invalid signature",
			signature: "sha256=invalid",
			body:      body,
			wantErr:   true,
		},
		{
			name:      "missing signature",
			signature: "",
			body:      body,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/webhook", bytes.NewBuffer(tt.body))
			if tt.signature != "" {
				req.Header.Set("x-hub-signature-256", tt.signature)
			}

			got, err := ParseWebhook(secret, req)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseWebhook() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if got == nil {
					t.Error("ParseWebhook() returned nil but wanted WebhookContext")
				} else if got.Signature != tt.signature {
					t.Errorf("ParseWebhook() signature = %v, want %v", got.Signature, tt.signature)
				}
			}
		})
	}
}
