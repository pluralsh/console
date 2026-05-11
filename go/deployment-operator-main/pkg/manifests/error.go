package manifests

import "fmt"

type HTTPError struct {
	StatusCode int
	URL        string
	Msg        string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s (url: %s)", e.StatusCode, e.Msg, e.URL)
}
