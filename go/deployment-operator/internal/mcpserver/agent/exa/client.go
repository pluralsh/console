package exa

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"sigs.k8s.io/yaml"
)

const (
	DefaultBaseURL        = "https://api.exa.ai"
	defaultNumResults     = 10
	defaultHighlightChars = 2000
	defaultMaxCharacters  = 3000
)

var categoryPattern = regexp.MustCompile(`\bcategory:(company|research\s*paper|news|personal\s*site|people)\b`)

type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

type Connection struct {
	URL      string
	ApiKey   string
	ProxyURL string
}

func NewClient(conn Connection) (*Client, error) {
	baseURL := strings.TrimSuffix(conn.URL, "/")
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}

	httpClient, err := newHTTPClient(conn.ProxyURL)
	if err != nil {
		return nil, err
	}

	return &Client{
		baseURL: baseURL,
		apiKey:  conn.ApiKey,
		http:    httpClient,
	}, nil
}

func newHTTPClient(proxyURL string) (*http.Client, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	if strings.TrimSpace(proxyURL) == "" {
		return client, nil
	}

	parsed, err := url.Parse(proxyURL)
	if err != nil {
		return nil, fmt.Errorf("invalid exa proxy url %q: %w", proxyURL, err)
	}

	client.Transport = &http.Transport{
		Proxy: http.ProxyURL(parsed),
	}
	return client, nil
}

type searchRequest struct {
	Query      string          `json:"query"`
	Type       string          `json:"type"`
	NumResults int             `json:"numResults,omitempty"`
	Category   string          `json:"category,omitempty"`
	Contents   *searchContents `json:"contents,omitempty"`
}

type searchContents struct {
	Highlights *highlightsConfig `json:"highlights,omitempty"`
}

type highlightsConfig struct {
	Query         string `json:"query"`
	MaxCharacters int    `json:"maxCharacters"`
}

func (c *Client) Search(ctx context.Context, query string, numResults int) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("exa api key is not configured")
	}
	if strings.TrimSpace(query) == "" {
		return "", fmt.Errorf("query is required")
	}
	if numResults <= 0 {
		numResults = defaultNumResults
	}
	if numResults > 100 {
		numResults = 100
	}

	categoryMatch := categoryPattern.FindStringSubmatch(query)
	category := ""
	cleanedQuery := query
	if len(categoryMatch) > 1 {
		category = strings.ToLower(strings.Join(strings.Fields(categoryMatch[1]), " "))
		cleanedQuery = strings.TrimSpace(categoryPattern.ReplaceAllString(query, ""))
	}
	if cleanedQuery == "" {
		cleanedQuery = query
	}

	reqBody := searchRequest{
		Query:      cleanedQuery,
		Type:       "auto",
		NumResults: numResults,
		Contents: &searchContents{
			Highlights: &highlightsConfig{
				Query:         cleanedQuery,
				MaxCharacters: defaultHighlightChars,
			},
		},
	}
	if category != "" {
		reqBody.Category = category
	}

	body, err := c.post(ctx, "/search", reqBody)
	if err != nil {
		return "", err
	}

	return jsonResponseToYAML(body)
}

type contentsRequest struct {
	IDs      []string        `json:"ids"`
	Contents contentsOptions `json:"contents"`
}

type contentsOptions struct {
	Text *textOptions `json:"text,omitempty"`
}

type textOptions struct {
	MaxCharacters int `json:"maxCharacters"`
}

func (c *Client) FetchContents(ctx context.Context, urls []string, maxCharacters int) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("exa api key is not configured")
	}
	if len(urls) == 0 {
		return "", fmt.Errorf("at least one url is required")
	}
	if maxCharacters <= 0 {
		maxCharacters = defaultMaxCharacters
	}

	reqBody := contentsRequest{
		IDs: urls,
		Contents: contentsOptions{
			Text: &textOptions{MaxCharacters: maxCharacters},
		},
	}

	body, err := c.post(ctx, "/contents", reqBody)
	if err != nil {
		return "", err
	}

	return jsonResponseToYAML(body)
}

func (c *Client) post(ctx context.Context, path string, body any) ([]byte, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal exa request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to create exa request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("exa request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read exa response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("exa api returned %s: %s", resp.Status, strings.TrimSpace(string(respBody)))
	}

	return respBody, nil
}

func jsonResponseToYAML(body []byte) (string, error) {
	var decoded any
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", fmt.Errorf("failed to decode exa response: %w", err)
	}

	yamlBody, err := yaml.Marshal(decoded)
	if err != nil {
		return "", fmt.Errorf("failed to encode exa response as yaml: %w", err)
	}

	return string(yamlBody), nil
}
