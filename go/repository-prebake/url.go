package prebake

import (
	"fmt"
	"net/url"
	"strings"
)

// StripUserinfo removes userinfo from URL-form remotes so tokens are not stored
// in origin or manifest.json. SCP-style git@host:path URLs are left unchanged.
func StripUserinfo(raw string) string {
	raw = strings.TrimSpace(raw)
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return raw
	}
	parsed.User = nil
	return parsed.String()
}

func repoNameFromURL(raw string) (string, error) {
	trimmed := strings.TrimSuffix(strings.TrimRight(strings.TrimSpace(raw), "/"), ".git")
	if i := strings.LastIndexAny(trimmed, "/:"); i >= 0 {
		trimmed = trimmed[i+1:]
	}
	if trimmed == "" {
		return "", fmt.Errorf("could not derive repository name from %s", raw)
	}
	return trimmed, nil
}
