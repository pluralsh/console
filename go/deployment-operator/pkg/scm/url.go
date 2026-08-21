package scm

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

func urlPathParts(raw string) ([]string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid PR URL %q: %w", raw, err)
	}
	path := strings.Trim(u.Path, "/")
	if path == "" {
		return nil, fmt.Errorf("invalid PR URL %q: missing path", raw)
	}
	parts := strings.Split(path, "/")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			out = append(out, part)
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("invalid PR URL %q: missing path", raw)
	}
	return out, nil
}

// parseGitHubPRURL extracts owner, repo, and PR number from a GitHub (or GitHub
// Enterprise / self-hosted) pull request URL such as:
//
//	https://github.com/owner/repo/pull/42
//	https://git.internal.example.com/owner/repo/pull/42
func parseGitHubPRURL(prURL string) (owner, repo string, number int, err error) {
	parts, err := urlPathParts(prURL)
	if err != nil {
		return "", "", 0, fmt.Errorf("cannot parse GitHub PR URL: %s", prURL)
	}
	if len(parts) < 4 || parts[2] != "pull" {
		return "", "", 0, fmt.Errorf("cannot parse GitHub PR URL: %s", prURL)
	}
	number, err = strconv.Atoi(parts[3])
	if err != nil {
		return "", "", 0, fmt.Errorf("invalid PR number in URL %s: %w", prURL, err)
	}
	return parts[0], strings.TrimSuffix(parts[1], ".git"), number, nil
}
