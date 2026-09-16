package prebake

import (
	"flag"
	"fmt"
	"os"
)

// Options configure a prebake run inside a container (or tests).
type Options struct {
	Config            string
	Dest              string
	RecurseSubmodules bool
	LFS               bool
	Chown             string
}

// Main parses CLI flags and runs prebake. Intended for cmd/prebake.
func Main(args []string) error {
	fs := flag.NewFlagSet("prebake", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	opts := Options{}
	fs.StringVar(&opts.Config, "config", "", "YAML file listing repositories (required)")
	fs.StringVar(&opts.Dest, "dest", "/data", "directory to write clones and manifest.json")
	fs.BoolVar(&opts.RecurseSubmodules, "recurse-submodules", false, "pass --recurse-submodules to git clone")
	fs.BoolVar(&opts.LFS, "lfs", false, "fetch Git LFS objects (skipped by default)")
	fs.StringVar(&opts.Chown, "chown", "", "uid:gid (or uid) to apply recursively to --dest")
	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), "Usage: prebake --config repos.yaml [--dest /data] [options]\n\n")
		fmt.Fprintf(fs.Output(), "Clone the repositories listed in a YAML config into --dest and write manifest.json.\n")
		fmt.Fprintf(fs.Output(), "If --dest/<path> already contains a git checkout, it is kept (no clone).\n\n")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return err
	}
	if opts.Config == "" {
		fs.Usage()
		return fmt.Errorf("--config is required")
	}
	return Run(opts)
}

// Run clones (or seeds) repositories and writes dest/manifest.json.
func Run(opts Options) error {
	if opts.Dest == "" {
		return fmt.Errorf("--dest is required")
	}
	cfg, err := LoadConfig(opts.Config)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(opts.Dest, 0o755); err != nil {
		return fmt.Errorf("create dest %q: %w", opts.Dest, err)
	}

	repos := make([]ManifestRepo, 0, len(cfg.Repositories))
	for _, repo := range cfg.Repositories {
		full, err := resolveDest(opts.Dest, repo.Path)
		if err != nil {
			return err
		}
		branch, err := materializeRepo(full, repo, opts)
		if err != nil {
			return err
		}
		repos = append(repos, ManifestRepo{
			URL:           repo.URL,
			Path:          repo.Path,
			DefaultBranch: branch,
		})
	}

	if err := writeManifest(opts.Dest, repos); err != nil {
		return err
	}
	if opts.Chown == "" {
		return nil
	}
	uid, gid, err := parseChown(opts.Chown)
	if err != nil {
		return err
	}
	return chownTree(opts.Dest, uid, gid)
}

func materializeRepo(dest string, repo Repository, opts Options) (string, error) {
	cloneURL := repo.cloneURL
	if cloneURL == "" {
		cloneURL = repo.URL
	}

	if isGitRepo(dest) {
		fmt.Fprintf(os.Stderr, "using existing checkout %s\n", dest)
	} else {
		exists, err := dirExists(dest)
		if err != nil {
			return "", err
		}
		if exists {
			empty, err := dirEmpty(dest)
			if err != nil {
				return "", err
			}
			if !empty {
				return "", fmt.Errorf("destination %s exists and is not a git repository", dest)
			}
		}
		fmt.Fprintf(os.Stderr, "cloning %s -> %s\n", repo.URL, dest)
		if err := gitClone(cloneURL, dest, repo.Branch, opts.RecurseSubmodules, opts.LFS); err != nil {
			return "", err
		}
	}

	if err := gitSetOrigin(dest, repo.URL); err != nil {
		return "", err
	}
	if err := gitUnsetExtraHeader(dest); err != nil {
		return "", err
	}
	if repo.Branch != "" {
		return repo.Branch, nil
	}
	return gitHeadBranch(dest)
}
