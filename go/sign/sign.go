package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
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

func sendWebhookRequest(url string, secret []byte, body []byte) ([]byte, error) {
	signature := signBody(secret, body)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", signature)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("webhook request failed with status: %s", resp.Status)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return respBody, nil
}

func handler(ctx context.Context, e event) ([]byte, error) {
	bodyBytes, err := json.Marshal(e.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal body: %w", err)
	}

	if len(e.Secret) == 0 {
		return nil, fmt.Errorf("secret can't be empty")
	}

	if len(e.URL) == 0 {
		return nil, fmt.Errorf("url can't be empty")
	}

	respBody, err := sendWebhookRequest(e.URL, []byte(e.Secret), bodyBytes)
	if err != nil {
		return nil, err
	}

	return respBody, nil
}
func main() {
	lambda.Start(handler)
}
