package clients

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/url"
	"strings"

	"resty.dev/v3"
)

type SplunkClient struct {
	*resty.Client

	baseURL string
}

func NewSplunkClient(baseURL, token, username, password string) *SplunkClient {
	client := resty.New()
	normalizedBaseURL, insecureSkipVerify := normalizeSplunkURL(baseURL)

	if insecureSkipVerify {
		// This is opt-in via URL query parameter for local/self-signed environments.
		client.SetTLSClientConfig(&tls.Config{InsecureSkipVerify: true})
	}

	if len(token) > 0 {
		client.SetHeader("Authorization", "Splunk "+token)
	} else if len(username) > 0 && len(password) > 0 {
		client.SetBasicAuth(username, password)
	}

	return &SplunkClient{
		Client:  client,
		baseURL: normalizedBaseURL,
	}
}

func normalizeSplunkURL(rawURL string) (string, bool) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return strings.TrimSuffix(rawURL, "/"), false
	}

	insecureSkipVerify := isTruthyQueryParam(parsedURL.Query(), "insecure_skip_verify")

	query := parsedURL.Query()
	query.Del("insecure_skip_verify")
	parsedURL.RawQuery = query.Encode()

	return strings.TrimSuffix(parsedURL.String(), "/"), insecureSkipVerify
}

func isTruthyQueryParam(query url.Values, keys ...string) bool {
	for _, key := range keys {
		value := strings.ToLower(strings.TrimSpace(query.Get(key)))
		if value == "1" || value == "true" {
			return true
		}
	}

	return false
}

func (in *SplunkClient) ExportSearch(ctx context.Context, params url.Values) (string, error) {
	response, err := in.R().
		SetContext(ctx).
		SetContentType("application/x-www-form-urlencoded").
		SetFormDataFromValues(params).
		Post(in.baseURL + "/services/search/v2/jobs/export")
	if err != nil {
		return "", err
	}
	if response.IsError() {
		return "", fmt.Errorf("splunk query failed: status=%d body=%s", response.StatusCode(), response.String())
	}

	return response.String(), nil
}
