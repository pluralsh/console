package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"strings"
)

func signBody(secret, body []byte) []byte {
	computed := hmac.New(sha256.New, secret)
	computed.Write(body)
	return []byte(computed.Sum(nil))
}

func verifySignature(secret []byte, signature string, body []byte) bool {
	const signaturePrefix = "sha256="
	const signatureLength = 71 // len(signaturePrefix) + len(hex(sha256))

	if len(signature) != signatureLength || !strings.HasPrefix(signature, signaturePrefix) {
		return false
	}

	actual := make([]byte, 32) // SHA-256 produces 32 bytes
	if _, err := hex.Decode(actual, []byte(signature[len(signaturePrefix):])); err != nil {
		return false
	}

	return hmac.Equal(signBody(secret, body), actual)
}

type WebhookContext struct {
	Signature string
}

func ParseWebhook(secret []byte, req *http.Request) (*WebhookContext, error) {
	wc := WebhookContext{}

	if wc.Signature = req.Header.Get("x-hub-signature-256"); len(wc.Signature) == 0 {
		return nil, errors.New("No signature!")
	}

	body, err := io.ReadAll(req.Body)

	if err != nil {
		return nil, err
	}

	if !verifySignature(secret, wc.Signature, body) {
		return nil, errors.New("Invalid signature")
	}

	return &wc, nil
}
