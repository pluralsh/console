package manifests

import (
	stderrors "errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/errors"
)

const (
	pluralDigestHeader = "x-plrl-digest"
	maxRetryAfter      = 10 * time.Minute
	getReaderAttempts  = 3
)

var (
	timeout = 10 * time.Second
	client  = &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			ResponseHeaderTimeout: timeout,
		},
	}
	rateLimitBaseDelay = 500 * time.Millisecond
)

func getBody(url, token string) (string, error) {
	resp, _, err := getReader(url, token, 1)
	if err != nil {
		return "", err
	}

	defer resp.Close()

	body, err := io.ReadAll(resp)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// GetReader fetches url, retrying rate limited requests with exponential backoff that honors Retry-After.
func GetReader(url, token string) (io.ReadCloser, http.Header, error) {
	return getReader(url, token, getReaderAttempts)
}

func getReader(url, token string, attempts int) (io.ReadCloser, http.Header, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Add("Authorization", "Token "+token)

	var lastErr error
	for i := range attempts {
		if i > 0 {
			time.Sleep(retryDelay(i-1, lastErr))
		}

		resp, header, retriable, err := doRequest(req)
		if err == nil {
			return resp, header, nil
		}
		if !retriable {
			return nil, nil, err
		}
		lastErr = err
	}
	return nil, nil, fmt.Errorf("could not fetch manifest, retries exhausted: %w", lastErr)
}

func retryDelay(attempt int, err error) time.Duration {
	delay := rateLimitBaseDelay << attempt
	var httpErr *HTTPError
	if stderrors.As(err, &httpErr) {
		delay = max(delay, httpErr.RetryAfter)
	}
	return delay + utils.Jitter(delay/2)
}

func parseRetryAfter(value string, now time.Time) time.Duration {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}

	var delay time.Duration
	if secs, err := strconv.Atoi(value); err == nil {
		delay = time.Duration(secs) * time.Second
	} else if t, err := http.ParseTime(value); err == nil {
		delay = t.Sub(now)
	}
	return min(max(delay, 0), maxRetryAfter)
}

func doRequest(req *http.Request) (io.ReadCloser, http.Header, bool, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, false, err
	}

	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		errMsg, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, nil, false, fmt.Errorf("could not read response body: %w", err)
		}

		httpErr := &HTTPError{StatusCode: resp.StatusCode, URL: req.URL.String(), Msg: string(errMsg)}

		if resp.StatusCode == http.StatusTooManyRequests {
			httpErr.RetryAfter = parseRetryAfter(resp.Header.Get("Retry-After"), time.Now())
			return nil, nil, true, httpErr
		}

		return nil, nil, false, httpErr
	}

	return resp.Body, resp.Header, false, nil
}

func fetchSha(consoleURL, token, serviceID string) (string, error) {
	url, err := sanitizeURL(consoleURL)
	if err != nil {
		return "", err
	}
	url = fmt.Sprintf("%s/ext/v1/digests?id=%s", url, serviceID)
	return getBody(url, token)
}

func fetch(url, token, sha, dir string) error {
	resp, header, err := getReader(url, token, 1)
	if err != nil {
		return err
	}
	defer resp.Close()
	tarballSha := header.Get(pluralDigestHeader)
	if tarballSha != "" && sha != tarballSha {
		return errors.NewDigestMismatchError(sha, tarballSha)
	}

	log.V(1).Info("finished request to", "url", url)

	return Untar(dir, resp)
}

func sanitizeURL(consoleURL string) (string, error) {
	u, err := url.Parse(consoleURL)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s://%s", u.Scheme, u.Host), nil
}
