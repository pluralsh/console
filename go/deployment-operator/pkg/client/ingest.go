package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

var (
	errIngestUnsupported = errors.New("console does not support this ingest endpoint")
	ingestHTTPClient     = &http.Client{Timeout: 2 * time.Minute}
)

// upload posts a bulk payload to one of the console's REST ingest endpoints, which process it far more
// cheaply than the equivalent GraphQL mutation, falling back to the mutation for consoles that predate them.
func (c *client) upload(path string, body func() any, fallback func() (*int64, error)) (*int64, error) {
	if !c.legacyIngest.Load() {
		count, err := c.post(path, body())
		if err == nil {
			return &count, nil
		}

		if !errors.Is(err, errIngestUnsupported) {
			return nil, err
		}
		c.legacyIngest.Store(true)
	}

	return fallback()
}

func (c *client) post(path string, body any) (int64, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return 0, err
	}

	u, err := url.Parse(c.url)
	if err != nil {
		return 0, err
	}

	endpoint := fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, path)
	req, err := http.NewRequestWithContext(c.ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token "+c.token)

	resp, err := ingestHTTPClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		var res struct {
			Count int64 `json:"count"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
			return 0, err
		}
		return res.Count, nil
	case http.StatusNotFound:
		return 0, errIngestUnsupported
	default:
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return 0, fmt.Errorf("upload to %s failed with status %d: %s", path, resp.StatusCode, msg)
	}
}
