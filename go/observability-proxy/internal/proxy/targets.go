package proxy

import (
	"fmt"
	"net/url"
	"path"
	"strings"
)

const (
	queryPrefix  = "/ext/v1/query/prometheus"
	lokiPushPath = "/loki/api/v1/push"
)

func BuildPrometheusQueryTarget(prometheusHost, incomingPath string) (*url.URL, error) {
	base, err := url.Parse(prometheusHost)
	if err != nil {
		return nil, fmt.Errorf("parse prometheus host: %w", err)
	}

	suffix := strings.TrimPrefix(incomingPath, queryPrefix)
	if suffix == "" {
		suffix = "/"
	}

	base.Path = joinPath(base.Path, suffix)
	return base, nil
}

func BuildPrometheusIngestTarget(prometheusHost string) (*url.URL, error) {
	base, err := url.Parse(prometheusHost)
	if err != nil {
		return nil, fmt.Errorf("parse prometheus host: %w", err)
	}

	segments := splitPath(base.Path)
	for i := 0; i+2 < len(segments); i++ {
		prefix := append([]string{}, segments[:i]...)
		switch {
		case segments[i] == "select" && segments[i+2] == "prometheus":
			base.Path = "/" + strings.Join(append(prefix, "insert", segments[i+1], "prometheus", "api", "v1", "write"), "/")
			return base, nil
		case segments[i] == "read" && segments[i+1] == "ns" && i+3 == len(segments):
			base.Path = "/" + strings.Join(append(prefix, "write", "ns", segments[i+2], "api", "v1", "write"), "/")
			return base, nil
		}
	}

	return nil, fmt.Errorf("prometheus host %q does not contain /select/{tenant}/prometheus or /read/ns/{namespace}", prometheusHost)
}

func BuildElasticTarget(elasticHost, suffix string) (*url.URL, error) {
	base, err := url.Parse(elasticHost)
	if err != nil {
		return nil, fmt.Errorf("parse elastic host: %w", err)
	}

	base.Path = joinPath(base.Path, suffix)
	return base, nil
}

func BuildLokiPushTarget(lokiHost string) (*url.URL, error) {
	base, err := url.Parse(lokiHost)
	if err != nil {
		return nil, fmt.Errorf("parse loki host: %w", err)
	}

	base.Path = joinPath(base.Path, lokiPushPath)
	return base, nil
}

func BuildLokiElasticTarget(lokiHost, suffix string) (*url.URL, error) {
	base, err := url.Parse(lokiHost)
	if err != nil {
		return nil, fmt.Errorf("parse loki host: %w", err)
	}

	base.Path = joinPath(base.Path, "/elasticsearch")
	base.Path = joinPath(base.Path, suffix)
	return base, nil
}

func joinPath(base, suffix string) string {
	if suffix == "" || suffix == "/" {
		if base == "" {
			return "/"
		}
		return base
	}

	suffix = strings.TrimPrefix(suffix, "/")

	if base == "" || base == "/" {
		return "/" + suffix
	}

	return path.Join(base, suffix)
}

func splitPath(raw string) []string {
	trimmed := strings.Trim(raw, "/")
	if trimmed == "" {
		return nil
	}

	return strings.Split(trimmed, "/")
}
