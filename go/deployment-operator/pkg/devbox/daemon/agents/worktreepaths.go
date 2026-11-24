package agents

import (
	"net/url"
	"path/filepath"
	"regexp"
	"strings"

	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/workspace"
)

// mentionTag is console's file mention in prompt text; the path group is what gets remapped.
var mentionTag = regexp.MustCompile(`(<plrl-devbox-file\s+path=")([^"]*)(")`)

// inWorktree maps a path inside a main checkout the thread has a worktree of to the same path in that worktree.
// Console's file tree shows the main checkouts, so without this a mention would point the agent at the shared
// working tree instead of the thread's own.
func (m *Manager) inWorktree(t *thread, p string) string {
	if t == nil || len(t.worktrees) == 0 {
		return p
	}
	abs := p
	if abs == "~" || strings.HasPrefix(abs, "~/") {
		abs = filepath.Join(m.opts.Home, strings.TrimPrefix(abs, "~"))
	}
	if !filepath.IsAbs(abs) {
		return p
	}
	abs = filepath.Clean(abs)
	for _, repo := range t.worktrees {
		root := filepath.Join(m.opts.Home, repo)
		if !fsutil.Within(root, abs) {
			continue
		}
		rel, err := filepath.Rel(root, abs)
		if err != nil {
			return p
		}
		out := filepath.Join(m.opts.Home, workspace.ThreadsDir, t.id, repo, rel)
		if strings.HasSuffix(p, "/") {
			out += "/"
		}
		return out
	}
	return p
}

// worktreeContent is a prompt with its file mentions and file links moved into the thread's worktrees. Blocks
// that change are copies, so the stored user message keeps what the user wrote.
func (m *Manager) worktreeContent(t *thread, content []*devboxv1.ContentBlock) []*devboxv1.ContentBlock {
	if t == nil || len(t.worktrees) == 0 {
		return content
	}
	out := make([]*devboxv1.ContentBlock, len(content))
	for i, b := range content {
		out[i] = b
		switch {
		case b.GetText() != nil:
			text := mentionTag.ReplaceAllStringFunc(b.GetText().GetText(), func(tag string) string {
				g := mentionTag.FindStringSubmatch(tag)
				return g[1] + m.inWorktree(t, g[2]) + g[3]
			})
			if text != b.GetText().GetText() {
				c := proto.Clone(b).(*devboxv1.ContentBlock)
				c.GetText().Text = text
				out[i] = c
			}
		case b.GetResourceLink() != nil:
			u, err := url.Parse(b.GetResourceLink().GetUri())
			if err != nil || u.Scheme != "file" {
				continue
			}
			if p := m.inWorktree(t, u.Path); p != u.Path {
				c := proto.Clone(b).(*devboxv1.ContentBlock)
				u.Path = p
				c.GetResourceLink().Uri = u.String()
				out[i] = c
			}
		}
	}
	return out
}
