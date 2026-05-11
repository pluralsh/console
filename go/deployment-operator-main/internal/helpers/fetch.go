package helpers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/pluralsh/console/go/polly/fs"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/errors"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func Fetch(options ...FetchOption) FetchClient {
	client := &fetchClient{}

	for _, option := range options {
		option(client)
	}

	client.init()

	return client
}

func (in *fetchClient) Tarball(url string) (string, error) {
	backoff := wait.Backoff{
		Duration: 1 * time.Second, // initial delay
		Factor:   2.0,             // multiply delay each retry
		Jitter:   0.1,             // add 10% random jitter
		Steps:    5,               // maximum number of retries
	}

	var lastErr error

	err := wait.ExponentialBackoff(backoff, func() (bool, error) {
		req, err := in.request(url)
		if err != nil {
			// stop retries
			return false, err
		}

		resp, err := in.client.Do(req)
		if err != nil {
			lastErr = err
			klog.V(2).InfoS("request failed, will retry", "url", url, "error", err)
			return false, nil // retryable
		}
		defer in.handleCloseResponseBody(resp)

		if err = in.handleStatusCode(resp); err != nil {
			lastErr = err
			klog.V(2).InfoS("bad status code, will retry", "url", url, "error", err)
			return false, nil // retryable
		}

		klog.V(2).InfoS("successfully fetched tarball", "url", url)
		_, untarErr := in.untar(resp)
		if untarErr != nil {
			lastErr = untarErr
			klog.V(2).InfoS("untar failed, will retry", "url", url, "error", untarErr)
			return false, nil // retryable
		}

		// Success
		return true, nil
	})

	if err != nil {
		// ExponentialBackoff returns an error if retries exhausted
		return in.destination, fmt.Errorf("failed to fetch tarball after retries: %w; last error: %w", err, lastErr)
	}

	return in.destination, nil
}

func (in *fetchClient) untar(resp *http.Response) (string, error) {
	klog.V(log.LogLevelExtended).InfoS("unpacking tarball", "destination", in.destination)
	return in.destination, fs.Untar(in.destination, resp.Body)
}

func (in *fetchClient) handleStatusCode(resp *http.Response) error {
	if resp.StatusCode == http.StatusOK {
		return nil
	}

	if resp.StatusCode == http.StatusForbidden {
		return errors.ErrUnauthenticated
	}

	if resp.StatusCode == http.StatusPaymentRequired {
		return errors.ErrTransientManifest
	}

	return fmt.Errorf("could not fetch the data, error code %d", resp.StatusCode)
}

func (in *fetchClient) handleCloseResponseBody(resp *http.Response) {
	if err := resp.Body.Close(); err != nil {
		klog.ErrorS(err, "failed to close response body")
	}
}

func (in *fetchClient) request(url string) (*http.Request, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	return req, nil
}

func (in *fetchClient) init() {
	if len(in.destination) == 0 {
		in.destination = CreateTempDirOrDie("", defaultFetchTmpDirPattern)
	}

	if in.transport == nil {
		in.transport = http.DefaultTransport
	}

	if in.timeout == nil {
		in.timeout = lo.ToPtr(defaultFetchTimeout)
	}

	if in.client == nil {
		in.client = &http.Client{
			Transport: in.transport,
			Timeout:   *in.timeout,
		}
	}
}

func FetchWithToken(token string) FetchOption {
	return func(client *fetchClient) {
		client.transport = NewAuthorizationTokenTransport(token)
	}
}

func FetchWithBearer(token string) FetchOption {
	return func(client *fetchClient) {
		client.transport = NewAuthorizationBearerTransport(token)
	}
}

func FetchToDir(destination string) FetchOption {
	return func(client *fetchClient) {
		client.destination = destination
	}
}

func FetchWithTimeout(timeout time.Duration) FetchOption {
	return func(client *fetchClient) {
		client.timeout = &timeout
	}
}
