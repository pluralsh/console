package prebake

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	tests := []struct {
		name       string
		yaml       string
		wantURL    string
		wantPath   string
		wantBranch string
		wantErr    string
	}{
		{
			name:       "mapping",
			yaml:       "repositories:\n  - url: https://github.com/pluralsh/console.git\n    path: console\n    branch: master\n",
			wantURL:    "https://github.com/pluralsh/console.git",
			wantPath:   "console",
			wantBranch: "master",
		},
		{
			name:     "url only",
			yaml:     "repositories:\n  - https://github.com/pluralsh/console.git\n",
			wantURL:  "https://github.com/pluralsh/console.git",
			wantPath: "console",
		},
		{
			name:       "defaultBranch alias",
			yaml:       "repositories:\n  - url: https://github.com/pluralsh/console.git\n    defaultBranch: main\n",
			wantURL:    "https://github.com/pluralsh/console.git",
			wantPath:   "console",
			wantBranch: "main",
		},
		{
			name:     "strips userinfo",
			yaml:     "repositories:\n  - url: https://x-access-token:ghs_secret@github.com/pluralsh/console.git\n    path: console\n",
			wantURL:  "https://github.com/pluralsh/console.git",
			wantPath: "console",
		},
		{
			name:    "duplicate path",
			yaml:    "repositories:\n  - url: https://github.com/a/one.git\n    path: same\n  - url: https://github.com/a/two.git\n    path: same\n",
			wantErr: "duplicate repository path",
		},
		{
			name:    "duplicate url",
			yaml:    "repositories:\n  - url: https://github.com/a/one.git\n    path: first\n  - url: https://github.com/a/one.git\n    path: second\n",
			wantErr: "duplicate repository url",
		},
		{
			name:    "path escape",
			yaml:    "repositories:\n  - url: https://github.com/a/one.git\n    path: ../escape\n",
			wantErr: "invalid prebake repository path",
		},
		{
			name:    "absolute path",
			yaml:    "repositories:\n  - url: https://github.com/a/one.git\n    path: /tmp/one\n",
			wantErr: "must be relative",
		},
		{
			name:    "empty",
			yaml:    "repositories: []\n",
			wantErr: "no repositories found",
		},
		{
			name:     "ignores compile keys",
			yaml:     "repositories:\n  - url: https://github.com/pluralsh/console.git\n    path: console\n    compileScript: precompile.sh\n    compileDockerfile: compile.Dockerfile\n",
			wantURL:  "https://github.com/pluralsh/console.git",
			wantPath: "console",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			path := filepath.Join(dir, tt.name+".yaml")
			if err := os.WriteFile(path, []byte(tt.yaml), 0o644); err != nil {
				t.Fatal(err)
			}
			cfg, err := LoadConfig(path)
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("LoadConfig() err = %v, want containing %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(cfg.Repositories) != 1 {
				t.Fatalf("len = %d, want 1", len(cfg.Repositories))
			}
			got := cfg.Repositories[0]
			if got.URL != tt.wantURL {
				t.Errorf("URL = %q, want %q", got.URL, tt.wantURL)
			}
			if got.Path != tt.wantPath {
				t.Errorf("Path = %q, want %q", got.Path, tt.wantPath)
			}
			if got.Branch != tt.wantBranch {
				t.Errorf("Branch = %q, want %q", got.Branch, tt.wantBranch)
			}
		})
	}
}

func TestStripUserinfo(t *testing.T) {
	t.Parallel()
	tests := []struct {
		in, want string
	}{
		{"https://user:token@github.com/org/repo.git", "https://github.com/org/repo.git"},
		{"https://github.com/org/repo.git", "https://github.com/org/repo.git"},
		{"git@github.com:org/repo.git", "git@github.com:org/repo.git"},
		{"ssh://git@github.com/org/repo.git", "ssh://github.com/org/repo.git"},
	}
	for _, tt := range tests {
		if got := StripUserinfo(tt.in); got != tt.want {
			t.Errorf("StripUserinfo(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
