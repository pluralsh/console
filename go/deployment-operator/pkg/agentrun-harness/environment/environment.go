package environment

import (
	"context"
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/controller"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"

	types "github.com/pluralsh/console/go/deployment-operator/pkg/harness/environment"
)

// gitSigningKeyPath is the mount path for the SSH signing key inside the container.
// Defined in pkg/common to stay in sync with the controller's agentrun_pod.go.
const gitSigningKeyPath = common.GitSigningKeyMountPath
const gitAskpassFileName = ".git-askpass"
const codebaseMemoryGitExcludePattern = ".codebase-memory/"

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
	repoDirPath := path.Join(in.dir, repoDir)
	if _, err := in.configureGitCredentials(); err != nil {
		return err
	}

	if _, err := os.Stat(path.Join(repoDirPath, ".git")); err == nil {
		klog.V(log.LogLevelInfo).InfoS("repository already exists, skipping clone", "dir", repoDirPath)
		if err := in.checkoutRequestedBranch(repoDirPath); err != nil {
			return err
		}
		return in.configureRepository(repoDirPath, "", "")
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

	cloneArgs := []string{"clone"}
	if branch := strings.TrimSpace(lo.FromPtr(in.agentRun.Branch)); branch != "" {
		cloneArgs = append(cloneArgs, "--branch", branch)
	}
	cloneArgs = append(cloneArgs, in.agentRun.Repository, repoDir)

	if err := exec.NewExecutable("git", exec.WithArgs(cloneArgs), exec.WithDir(in.dir)).Run(context.Background()); err != nil {
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

	repoDirPath = path.Join(in.dir, repoDir)
	return in.configureRepository(repoDirPath, userName, userEmail)
}

func (in *environment) checkoutRequestedBranch(repoDirPath string) error {
	branch := strings.TrimSpace(lo.FromPtr(in.agentRun.Branch))
	if branch == "" {
		return nil
	}

	currentBranch, _ := exec.NewExecutable("git",
		exec.WithArgs([]string{"branch", "--show-current"}),
		exec.WithDir(repoDirPath),
	).RunWithOutput(context.Background())
	if strings.TrimSpace(string(currentBranch)) == branch {
		return nil
	}

	if out, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"fetch", "origin", branch}),
		exec.WithDir(repoDirPath),
	).RunWithOutput(context.Background()); err != nil {
		return fmt.Errorf("failed to fetch branch %s: %w: %s", branch, err, out)
	}

	if out, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"checkout", branch}),
		exec.WithDir(repoDirPath),
	).RunWithOutput(context.Background()); err != nil {
		return fmt.Errorf("failed to checkout branch %s: %w: %s", branch, err, out)
	}

	return nil
}

func (in *environment) configureRepository(repoDirPath, userName, userEmail string) error {
	if userName != "" {
		if err := exec.NewExecutable("git",
			exec.WithArgs([]string{"config", "user.name", userName}),
			exec.WithDir(repoDirPath),
		).Run(context.Background()); err != nil {
			return err
		}
	}

	if userEmail != "" {
		if err := exec.NewExecutable("git",
			exec.WithArgs([]string{"config", "user.email", userEmail}),
			exec.WithDir(repoDirPath),
		).Run(context.Background()); err != nil {
			return err
		}
	}

	if err := in.configureGitSigning(repoDirPath); err != nil {
		return fmt.Errorf("failed to configure git signing: %w", err)
	}

	if err := in.configureGitProxy(repoDirPath); err != nil {
		return fmt.Errorf("failed to configure git proxy: %w", err)
	}

	if !helpers.GetPluralEnvBool(controller.EnvMemoryEnabled, false) {
		if err := configureCodebaseMemoryGitExclude(repoDirPath); err != nil {
			return fmt.Errorf("failed to configure codebase-memory git exclude: %w", err)
		}
	}

	cmd := exec.NewExecutable("git", exec.WithArgs([]string{"branch", "--show-current"}), exec.WithDir(repoDirPath))
	output, err := cmd.RunWithOutput(context.Background())
	if err != nil {
		return err
	}
	baseBranch := strings.TrimSpace(string(output))

	cmd = exec.NewExecutable("git", exec.WithArgs([]string{"rev-parse", "HEAD"}), exec.WithDir(repoDirPath))
	output, err = cmd.RunWithOutput(context.Background())
	if err != nil {
		return err
	}

	config := &Config{
		Dir:        repoDirPath,
		BaseBranch: baseBranch,
		BaseCommit: strings.TrimSpace(string(output)),
	}

	klog.V(log.LogLevelInfo).InfoS("repository ready", "url", in.agentRun.Repository, "dir", repoDirPath)
	return config.Save()
}

func (in *environment) configureGitCredentials() (string, error) {
	if in.agentRun.ScmCreds == nil || in.agentRun.ScmCreds.Token == "" {
		return "", nil
	}

	klog.V(log.LogLevelDefault).InfoS("configuring git credentials", "username", in.agentRun.ScmCreds.Username)
	if err := os.Setenv("GIT_ACCESS_TOKEN", in.agentRun.ScmCreds.Token); err != nil {
		return "", err
	}

	askpassPath := path.Join(in.dir, gitAskpassFileName)
	if err := os.WriteFile(askpassPath, []byte(gitAskpassScript()), 0700); err != nil {
		return "", err
	}

	if err := exec.NewExecutable("git",
		exec.WithArgs([]string{"config", "--global", "core.askPass", askpassPath}),
	).Run(context.Background()); err != nil {
		return "", err
	}

	if err := os.Setenv("GIT_ASKPASS", askpassPath); err != nil {
		return "", err
	}

	return askpassPath, nil
}

func gitAskpassScript() string {
	return "#!/bin/sh\necho ${GIT_ACCESS_TOKEN}"
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

func configureCodebaseMemoryGitExclude(repoDirPath string) error {
	excludePath := path.Join(repoDirPath, ".git", "info", "exclude")
	if err := os.MkdirAll(path.Dir(excludePath), 0755); err != nil {
		return err
	}

	contents, err := os.ReadFile(excludePath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	for _, line := range strings.Split(string(contents), "\n") {
		if strings.TrimSpace(line) == codebaseMemoryGitExcludePattern {
			return nil
		}
	}

	prefix := ""
	if len(contents) > 0 && !strings.HasSuffix(string(contents), "\n") {
		prefix = "\n"
	}
	return os.WriteFile(excludePath, append(contents, []byte(prefix+codebaseMemoryGitExcludePattern+"\n")...), 0644)
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
