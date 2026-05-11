package helpers

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// ParseProviderBaseURL parses provider-host for reverse proxies. Values without a
// scheme (e.g. "localhost:8081") are misread by net/url as scheme "localhost";
// this function adds http:// for loopback-style hosts and https:// otherwise.
func ParseProviderBaseURL(host string) (*url.URL, error) {
	host = strings.TrimSpace(host)
	if host == "" {
		return nil, fmt.Errorf("provider host is empty")
	}
	if strings.HasPrefix(host, "http://") || strings.HasPrefix(host, "https://") {
		return url.Parse(host)
	}
	scheme := "https://"
	if bareHostLooksLocal(host) {
		scheme = "http://"
	}
	return url.Parse(scheme + host)
}

func bareHostLooksLocal(host string) bool {
	var hostname string
	if h, _, err := net.SplitHostPort(host); err == nil {
		hostname = h
	} else {
		hostname = host
	}
	hostname = strings.TrimPrefix(strings.TrimSuffix(hostname, "]"), "[")
	hostname = strings.ToLower(hostname)
	switch hostname {
	case "localhost", "::1", "0.0.0.0":
		return true
	default:
		return strings.HasPrefix(hostname, "127.")
	}
}
