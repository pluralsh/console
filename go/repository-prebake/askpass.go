package prebake

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const defaultGitUsername = "x-access-token"

const gitAskpassScript = `#!/bin/sh
case "$1" in
*[Uu]sername*) echo "$GIT_USERNAME" ;;
*) echo "$GIT_ACCESS_TOKEN" ;;
esac
`

type gitAuth struct {
	token       string
	username    string
	askpassPath string
}

func gitCredential() (token, username string) {
	token = strings.TrimSpace(os.Getenv("GIT_ACCESS_TOKEN"))
	if token == "" {
		token = strings.TrimSpace(os.Getenv("GIT_PASSWORD"))
	}
	username = strings.TrimSpace(os.Getenv("GIT_USERNAME"))
	if username == "" {
		username = defaultGitUsername
	}
	return token, username
}

// prepareGitAuth writes a GIT_ASKPASS helper when GIT_ACCESS_TOKEN or
// GIT_PASSWORD is set. The helper lives in a temp dir, not --dest, so it is
// not copied into the agent-run working tree.
func prepareGitAuth() (*gitAuth, func(), error) {
	token, username := gitCredential()
	if token == "" {
		return nil, func() {}, nil
	}

	dir, err := os.MkdirTemp("", "prebake-askpass-")
	if err != nil {
		return nil, nil, fmt.Errorf("create askpass dir: %w", err)
	}
	cleanup := func() { _ = os.RemoveAll(dir) }

	path := filepath.Join(dir, "askpass")
	if err := os.WriteFile(path, []byte(gitAskpassScript), 0700); err != nil {
		cleanup()
		return nil, nil, fmt.Errorf("write askpass: %w", err)
	}

	return &gitAuth{token: token, username: username, askpassPath: path}, cleanup, nil
}
