package manifests

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/pluralsh/deployment-operator/pkg/errors"
)

const pluralDigestHeader = "x-plrl-digest"

var (
	timeout = 60 * time.Second
	client  = &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			ResponseHeaderTimeout: timeout,
		},
	}
)

func getBody(url, token string) (string, error) {
	resp, _, err := GetReader(url, token)
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

func GetReader(url, token string) (io.ReadCloser, http.Header, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Add("Authorization", "Token "+token)

	for i := 0; i < 3; i++ {
		resp, header, retriable, err := doRequest(req)
		if err != nil {
			if !retriable {
				return nil, nil, err
			}

			time.Sleep(time.Duration(50*(i+1)) * time.Millisecond)
			continue
		}

		return resp, header, nil
	}
	return nil, nil, fmt.Errorf("could not fetch manifest, retries exhaused: %w", err)
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

func fetch(url, token, sha string) (string, error) {
	dir, err := os.MkdirTemp("", "manifests")
	if err != nil {
		return "", err
	}

	resp, header, err := GetReader(url, token)
	if err != nil {
		return "", err
	}
	defer resp.Close()
	tarballSha := header.Get(pluralDigestHeader)
	if tarballSha != "" && sha != tarballSha {
		return "", errors.NewDigestMismatchError(sha, tarballSha)
	}

	log.V(1).Info("finished request to", "url", url)

	if err := Untar(dir, resp); err != nil {
		return "", err
	}

	return dir, nil
}

func sanitizeURL(consoleURL string) (string, error) {
	u, err := url.Parse(consoleURL)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s://%s", u.Scheme, u.Host), nil
}
