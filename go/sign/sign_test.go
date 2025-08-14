package main

import (
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendWebhookRequest(t *testing.T) {
	secret := []byte("test-secret")
	body := []byte(`{"test":"data"}`)
	expectedSignature := signBody(secret, body)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Content-Type"); got != "application/json" {
			t.Errorf("Content-Type = %v, want application/json", got)
		}
		if got := r.Header.Get("X-Hub-Signature-256"); got != expectedSignature {
			t.Errorf("X-Hub-Signature-256 = %v, want %v", got, expectedSignature)
		}
	}))
	defer server.Close()

	err := sendWebhookRequest(server.URL, secret, body)
	if err != nil {
		t.Errorf("SendWebhook() error = %v", err)
	}
}

func TestSignBody(t *testing.T) {
	secret := []byte("test-secret")
	body := []byte("test-body")

	signature := signBody(secret, body)

	if len(signature) != 71 || signature[:7] != "sha256=" {
		t.Errorf("Invalid signature format: %v", signature)
	}

	_, err := hex.DecodeString(signature[7:])
	if err != nil {
		t.Errorf("Invalid hex in signature: %v", err)
	}
}
