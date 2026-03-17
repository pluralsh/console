package proxy

import (
	"fmt"
	"net/url"
	"path"
	"strings"
)

const queryPrefix = "/ext/v1/query/prometheus"

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
		if segments[i] == "select" && segments[i+2] == "prometheus" {
			tenant := segments[i+1]
			prefix := append([]string{}, segments[:i]...)
			base.Path = "/" + strings.Join(append(prefix, "insert", tenant, "prometheus", "api", "v1", "write"), "/")
			return base, nil
		}
	}

	return nil, fmt.Errorf("prometheus host %q does not contain /select/{tenant}/prometheus", prometheusHost)
}

func BuildElasticTarget(elasticHost, suffix string) (*url.URL, error) {
	base, err := url.Parse(elasticHost)
	if err != nil {
		return nil, fmt.Errorf("parse elastic host: %w", err)
	}

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

	if strings.HasPrefix(suffix, "/") {
		suffix = strings.TrimPrefix(suffix, "/")
	}

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
