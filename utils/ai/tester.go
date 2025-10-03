package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	openai "github.com/sashabaranov/go-openai"
)

func testOpenAIConnection(baseURL, apiKey *string) bool {
	// Configure client
	token := ""
	if apiKey != nil {
		token = *apiKey
	} else if envKey := os.Getenv("OPENAI_API_KEY"); envKey != "" {
		token = envKey
	} else {
		fmt.Println("API key must be provided either as argument or OPENAI_API_KEY environment variable")
		return false
	}

	config := openai.DefaultConfig(token)

	if baseURL != nil {
		config.BaseURL = *baseURL
	}

	// Create request body
	reqBody := []byte(`{
		"model": "gpt-5-mini",
		"messages": [
			{
				"role": "user", 
				"content": "Please write me a haiku"
			}
		]
	}`)

	// Create HTTP request
	req, err := http.NewRequestWithContext(
		context.Background(),
		"POST",
		config.BaseURL+"/chat/completions",
		bytes.NewBuffer(reqBody),
	)
	if err != nil {
		fmt.Println("OpenAI Connection Test Failed!")
		fmt.Println("Error:", err)
		return false
	}

	// Add headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	// Make request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("OpenAI Connection Test Failed!")
		fmt.Println("Error:", err)
		return false
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("OpenAI Connection Test Failed! Status: %d\n", resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Response body: %s\n", string(body))
		resp.Body = io.NopCloser(bytes.NewBuffer(body)) // Reset the body for later use
		return false
	}

	// Parse response
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Println("OpenAI Connection Test Failed!")
		fmt.Println("Error parsing response:", err)
		return false
	}

	fmt.Println("OpenAI Connection Test Successful!")
	fmt.Println("Response:", result.Choices[0].Message.Content)
	return true
}

func main() {
	var baseURL, apiKey *string

	if len(os.Args) > 1 {
		baseURL = &os.Args[1]
	}
	if len(os.Args) > 2 {
		apiKey = &os.Args[2]
	}

	testOpenAIConnection(baseURL, apiKey)
}
