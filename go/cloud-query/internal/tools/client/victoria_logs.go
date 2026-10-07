package client

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"resty.dev/v3"
)

type VictoriaLogsClient struct {
	*resty.Client

	baseURL string
}

func NewVictoriaLogsClient(baseURL, token, username, password, accountID, projectID string) *VictoriaLogsClient {
	client := resty.New()

	if len(token) > 0 {
		client.SetAuthToken(token)
		client.SetAuthScheme("Bearer")
	} else if len(username) > 0 && len(password) > 0 {
		client.SetBasicAuth(username, password)
	}

	if accountID != "" {
		client.SetHeader("AccountID", accountID)
	}
	if projectID != "" {
		client.SetHeader("ProjectID", projectID)
	}

	return &VictoriaLogsClient{
		Client:  client,
		baseURL: strings.TrimSuffix(baseURL, "/"),
	}
}

func (in *VictoriaLogsClient) Query(ctx context.Context, params url.Values) (string, error) {
	return in.post(ctx, "/select/logsql/query", params)
}

func (in *VictoriaLogsClient) Hits(ctx context.Context, params url.Values) (string, error) {
	return in.post(ctx, "/select/logsql/hits", params)
}

func (in *VictoriaLogsClient) post(ctx context.Context, path string, params url.Values) (string, error) {
	response, err := in.R().
		SetContext(ctx).
		SetContentType("application/x-www-form-urlencoded").
		SetFormDataFromValues(params).
		Post(in.baseURL + path)
	if err != nil {
		return "", err
	}
	if response.IsError() {
		return "", fmt.Errorf("victoria logs %s failed: status=%d body=%s", path, response.StatusCode(), response.String())
	}

	return response.String(), nil
}
