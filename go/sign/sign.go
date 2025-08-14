package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aws/aws-lambda-go/lambda"
)

type event struct {
	URL    string                 `json:"url"`
	Secret string                 `json:"secret"`
	Body   map[string]interface{} `json:"body"`
}

func signBody(secret, body []byte) string {
	computed := hmac.New(sha256.New, secret)
	computed.Write(body)
	return "sha256=" + hex.EncodeToString(computed.Sum(nil))
}

func sendWebhookRequest(url string, secret []byte, body []byte) error {
	signature := signBody(secret, body)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", signature)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook request failed with status: %s", resp.Status)
	}

	return nil
}

func handler(ctx context.Context, e event) (string, error) {
	bodyBytes, err := json.Marshal(e.Body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal body: %w", err)
	}

	if len(e.Secret) == 0 {
		return "", fmt.Errorf("secret can't be empty: %w", err)
	}

	err = sendWebhookRequest(e.URL, []byte(e.Secret), bodyBytes)
	if err != nil {
		return "", err
	}

	return "Webhook request sent successfully", nil
}
func main() {
	lambda.Start(handler)
}
