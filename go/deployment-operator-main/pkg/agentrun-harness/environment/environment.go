package environment

import (
	"context"
	"fmt"
	"os"
	"path"
	"strings"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/log"

	types "github.com/pluralsh/deployment-operator/pkg/harness/environment"
)

// gitSigningKeyPath is the mount path for the SSH signing key inside the container.
// Defined in pkg/common to stay in sync with the controller's agentrun_pod.go.
const gitSigningKeyPath = common.GitSigningKeyMountPath

// Setup implements Environment interface.
func (in *environment) Setup() error {
	if err := in.prepareWorkingDir(); err != nil {
		return fmt.Errorf("failed to prepare working directory: %w", err)
	}
	if err := in.cloneRepository(); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	return nil
}

// prepareWorkingDir creates the working directory
func (in *environment) prepareWorkingDir() error {
	if err := os.MkdirAll(in.dir, 0755); err != nil {
		return fmt.Errorf("failed to create working directory: %w", err)
	}

	klog.V(log.LogLevelInfo).InfoS("working directory prepared", "path", in.dir)
	return nil
}

// cloneRepository clones the target repository using SCM credentials
func (in *environment) cloneRepository() error {
	if in.agentRun.Repository == "" {
		return fmt.Errorf("repository URL is required")
	}

	repoDir := "repository"

	// Add auth if SCM credentials are available
	if in.agentRun.ScmCreds != nil {
		klog.V(log.LogLevelDefault).InfoS("configuring git credentials", "username", in.agentRun.ScmCreds.Username)
		if err := os.Setenv("GIT_ACCESS_TOKEN", in.agentRun.ScmCreds.Token); err != nil {
			return err
		}
	}

	// Set proxy for clone via environment variable so it takes effect immediately.
	// The same proxy is later written into the repo-local git config so that
	// subsequent push/fetch operations inside the cloned repo also use it.
	if proxy := os.Getenv("PLRL_GIT_PROXY"); proxy != "" {
		if err := os.Setenv("https_proxy", proxy); err != nil {
			return err
		}
		if err := os.Setenv("http_proxy", proxy); err != nil {
			return err
		}
	}

	if err := exec.NewExecutable(
		"git",
		exec.WithArgs([]string{"clone", in.agentRun.Repository, repoDir}),
		exec.WithDir(in.dir),
	).Run(context.Background()); err != nil {
		return err
	}

	var userName, userEmail string
	if in.consoleTokenClient != nil {
		user, _ := in.consoleTokenClient.Me()
		if user != nil && user.Name != "" && user.Email != "" {
			userName = user.Name
			userEmail = user.Email
		}
	}

	if userName == "" && in.agentRun.ScmCreds != nil {
		userName = in.agentRun.ScmCreds.Username
	}
	if userEmail == "" {
		userEmail = "agent@plural.sh" // fallback
	}

	repoDirPath := path.Join(in.dir, repoDir)
	if err := exec.NewExecutable("git",
		exec.WithArgs([]string{"config", "user.name", userName}),
		exec.WithDir(repoDirPath),
	).Run(context.Background()); err != nil {
		return err
	}

	if err := exec.NewExecutable("git",
		exec.WithArgs([]string{"config", "user.email", userEmail}),
		exec.WithDir(repoDirPath),
	).Run(context.Background()); err != nil {
		return err
	}

	if err := in.configureGitSigning(repoDirPath); err != nil {
		return fmt.Errorf("failed to configure git signing: %w", err)
	}

	if err := in.configureGitProxy(repoDirPath); err != nil {
		return fmt.Errorf("failed to configure git proxy: %w", err)
	}

	cmd := exec.NewExecutable("git", exec.WithArgs([]string{"branch", "--show-current"}), exec.WithDir(repoDirPath))
	output, err := cmd.RunWithOutput(context.Background())
	if err != nil {
		return err
	}

	config := &Config{
		Dir:        repoDirPath,
		BaseBranch: strings.TrimSpace(string(output)),
	}

	klog.V(log.LogLevelInfo).InfoS("repository cloned", "url", in.agentRun.Repository, "dir", repoDir)
	return config.Save()
}

// configureGitSigning configures SSH commit signing using the mounted private key.
func (in *environment) configureGitSigning(repoDirPath string) error {
	if _, err := os.Stat(gitSigningKeyPath); os.IsNotExist(err) {
		return nil
	}

	klog.V(log.LogLevelInfo).InfoS("configuring SSH git commit signing", "path", gitSigningKeyPath)

	for _, args := range [][]string{
		{"config", "gpg.format", "ssh"},
		{"config", "user.signingKey", gitSigningKeyPath},
		{"config", "commit.gpgSign", "true"},
	} {
		if err := exec.NewExecutable("git",
			exec.WithArgs(args),
			exec.WithDir(repoDirPath),
		).Run(context.Background()); err != nil {
			return fmt.Errorf("git %v failed: %w", args, err)
		}
	}

	klog.V(log.LogLevelInfo).InfoS("git SSH commit signing configured", "key", gitSigningKeyPath)
	return nil
}

// configureGitProxy writes http.proxy into the repo-local git config so that
// push/fetch operations inside the already-cloned repository use the proxy.
// The proxy is also applied to the git clone itself via https_proxy/http_proxy
// environment variables set earlier in cloneRepository.
func (in *environment) configureGitProxy(repoDirPath string) error {
	proxy := os.Getenv("PLRL_GIT_PROXY")
	if proxy == "" {
		return nil
	}

	klog.V(log.LogLevelInfo).InfoS("configuring git proxy", "proxy", proxy)
	return exec.NewExecutable("git",
		exec.WithArgs([]string{"config", "http.proxy", proxy}),
		exec.WithDir(repoDirPath),
	).Run(context.Background())
}

// init ensures that all required values are initialized
func (in *environment) init() types.Environment {
	if in.agentRun == nil {
		klog.Fatal("could not initialize environment: agentRun is nil")
	}

	if len(in.dir) != 0 {
		helpers.EnsureDirOrDie(in.dir)
	}

	return in
}

// New creates a new Environment.
func New(options ...Option) types.Environment {
	result := new(environment)

	for _, opt := range options {
		opt(result)
	}

	return result.init()
}
