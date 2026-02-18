package tools

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

func parseTimeRange(r *toolquery.TimeRange) (start time.Time, end time.Time, err error) {
	if r == nil || r.Start == nil || r.End == nil {
		return time.Time{}, time.Time{}, fmt.Errorf("%w: missing time range", ErrInvalidArgument)
	}

	start = r.Start.AsTime()
	end = r.End.AsTime()

	if end.Before(start) {
		return time.Time{}, time.Time{}, fmt.Errorf("%w: end time must be after start time", ErrInvalidArgument)
	}

	return start, end, nil
}

func appendPath(baseURL, path string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	parsed.Path = strings.TrimRight(parsed.Path, "/") + "/" + strings.TrimLeft(path, "/")
	return parsed.String(), nil
}
