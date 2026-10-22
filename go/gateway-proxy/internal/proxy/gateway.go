package proxy

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// TokenSource supplies OAuth access tokens for gateway calls.
type TokenSource interface {
	Token(ctx context.Context) (string, error)
	Invalidate(token string)
}

// Gateway calls the FM gateway's Bedrock invoke endpoints.
type Gateway struct {
	BaseURL string
	Tokens  TokenSource
	Client  *http.Client
	Timeout time.Duration
}

type invokeRequest struct {
	ModelID       string
	Stream        bool
	Body          []byte
	CorrelationID string
}

// errTokenUnavailable wraps failures obtaining an OAuth token.
type errTokenUnavailable struct{ err error }

func (e *errTokenUnavailable) Error() string { return "fetching gateway token: " + e.err.Error() }
func (e *errTokenUnavailable) Unwrap() error { return e.err }

// Invoke posts the request to the gateway. A 401 response is retried once with a freshly fetched
// token, since the cached token may have been revoked before its advertised expiry.
func (g *Gateway) Invoke(ctx context.Context, req invokeRequest) (*http.Response, error) {
	resp, token, err := g.do(ctx, req)
	if err != nil || resp.StatusCode != http.StatusUnauthorized {
		return resp, err
	}

	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	_ = resp.Body.Close()
	g.Tokens.Invalidate(token)

	resp, _, err = g.do(ctx, req)
	return resp, err
}

func (g *Gateway) do(ctx context.Context, req invokeRequest) (*http.Response, string, error) {
	token, err := g.Tokens.Token(ctx)
	if err != nil {
		return nil, "", &errTokenUnavailable{err}
	}

	action := "invoke"
	accept := "application/json"
	if req.Stream {
		action = "invoke-with-response-stream"
		accept = eventStreamContentType + ", text/event-stream"
	}
	endpoint := fmt.Sprintf("%s/model/%s/%s", g.BaseURL, url.PathEscape(req.ModelID), action)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(req.Body))
	if err != nil {
		return nil, "", err
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", accept)
	if req.CorrelationID != "" {
		httpReq.Header.Set("Client-Correlation-Id", req.CorrelationID)
	}
	if g.Timeout > 0 {
		httpReq.Header.Set("Request-Timeout-Ms", strconv.FormatInt(g.Timeout.Milliseconds(), 10))
	}

	resp, err := g.Client.Do(httpReq)
	if err != nil {
		return nil, token, err
	}
	return resp, token, nil
}
