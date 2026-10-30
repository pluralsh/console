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

type countResponse struct {
	Count int64 `json:"count"`
}

// upload posts a bulk payload to one of the console's REST ingest endpoints, which process it far more
// cheaply than the equivalent GraphQL mutation, decoding the response into out if it's set. Consoles that
// predate the endpoints respond with a 404, after which the GraphQL fallback is always used instead.
func (c *client) upload(path string, body func() any, out any, fallback func() error) error {
	if !c.legacyIngest.Load() {
		err := c.post(path, body(), out)
		if !errors.Is(err, errIngestUnsupported) {
			return err
		}
		c.legacyIngest.Store(true)
	}

	return fallback()
}

func (c *client) post(path string, body, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	u, err := url.Parse(c.url)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, path)
	req, err := http.NewRequestWithContext(c.ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token "+c.token)

	resp, err := ingestHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		if out == nil {
			return nil
		}
		return json.NewDecoder(resp.Body).Decode(out)
	case http.StatusNotFound:
		return errIngestUnsupported
	default:
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("upload to %s failed with status %d: %s", path, resp.StatusCode, msg)
	}
}
