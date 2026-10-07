package prebake

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config is the YAML file listing repositories to clone into a prebake image.
type Config struct {
	Repositories []Repository `yaml:"repositories"`
}

// Repository is one clone entry. URL is required; Path defaults to the repo name.
type Repository struct {
	URL      string
	Path     string
	Branch   string
	cloneURL string
}

// UnmarshalYAML accepts either a URL string or a mapping with url/path/branch.
func (r *Repository) UnmarshalYAML(value *yaml.Node) error {
	switch value.Kind {
	case yaml.ScalarNode:
		r.URL = strings.TrimSpace(value.Value)
		return nil
	case yaml.MappingNode:
		var raw struct {
			URL           string `yaml:"url"`
			Path          string `yaml:"path"`
			Branch        string `yaml:"branch"`
			DefaultBranch string `yaml:"defaultBranch"`
		}
		if err := value.Decode(&raw); err != nil {
			return err
		}
		r.URL = strings.TrimSpace(raw.URL)
		r.Path = strings.TrimSpace(raw.Path)
		r.Branch = strings.TrimSpace(raw.Branch)
		if r.Branch == "" {
			r.Branch = strings.TrimSpace(raw.DefaultBranch)
		}
		return nil
	default:
		return fmt.Errorf("repository entry must be a URL string or a mapping")
	}
}

// LoadConfig reads and validates a repositories YAML file.
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %q: %w", path, err)
	}

	var file struct {
		Repositories []Repository `yaml:"repositories"`
		Repos        []Repository `yaml:"repos"`
	}
	if err := yaml.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("parse config %q: %w", path, err)
	}

	cfg := &Config{Repositories: file.Repositories}
	if len(cfg.Repositories) == 0 {
		cfg.Repositories = file.Repos
	}
	if len(cfg.Repositories) == 0 {
		return nil, fmt.Errorf("no repositories found in %s", path)
	}

	seenPaths := make(map[string]struct{}, len(cfg.Repositories))
	seenURLs := make(map[string]struct{}, len(cfg.Repositories))
	for i := range cfg.Repositories {
		repo := &cfg.Repositories[i]
		if repo.URL == "" {
			return nil, fmt.Errorf("repository %d is missing url", i)
		}
		repo.cloneURL = repo.URL
		repo.URL = StripUserinfo(repo.URL)
		if repo.Path == "" {
			name, err := repoNameFromURL(repo.URL)
			if err != nil {
				return nil, err
			}
			repo.Path = name
		}
		if err := validatePath(repo.Path); err != nil {
			return nil, err
		}
		if _, ok := seenPaths[repo.Path]; ok {
			return nil, fmt.Errorf("duplicate repository path: %s", repo.Path)
		}
		if _, ok := seenURLs[repo.URL]; ok {
			return nil, fmt.Errorf("duplicate repository url: %s", repo.URL)
		}
		seenPaths[repo.Path] = struct{}{}
		seenURLs[repo.URL] = struct{}{}
	}
	return cfg, nil
}
