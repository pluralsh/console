package workspace

import (
	"fmt"
	"regexp"
	"strings"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// Managed block markers in Project.md. The daemon only ever rewrites what's between them, and appends
// `### <repo>` stubs under "## Repositories"; it never rewrites prose.
const (
	BlockStart       = "<!-- devbox:repos:start (managed by devbox-daemon; do not edit) -->"
	BlockEnd         = "<!-- devbox:repos:end -->"
	blockStartPrefix = "<!-- devbox:repos:start"
)

// RepoInfo is one row of the managed table.
type RepoInfo struct {
	Checkout    *devboxv1.Checkout
	Description string
}

// RenderTable renders the managed block (markers included).
func RenderTable(repos []RepoInfo) string {
	var b strings.Builder
	b.WriteString(BlockStart + "\n")
	b.WriteString("| Path | Remote | Default branch | Checked out |\n")
	b.WriteString("|---|---|---|---|\n")
	for _, r := range repos {
		c := r.Checkout
		out := c.GetBranch()
		if out == "" {
			out = "(detached)"
		}
		if sha := c.GetHeadSha(); len(sha) >= 7 {
			out += " @ " + sha[:7]
		}
		fmt.Fprintf(&b, "| ~/%s | %s | %s | %s |\n", cell(c.GetName()), cell(displayRemote(c.GetRemoteUrl())), cell(c.GetDefaultBranch()), cell(out))
	}
	b.WriteString(BlockEnd)
	return b.String()
}

func cell(s string) string {
	s = strings.ReplaceAll(s, "|", `\|`)
	s = strings.ReplaceAll(s, "\n", " ")
	if s == "" {
		return "-"
	}
	return s
}

// displayRemote shortens a clone URL to host/owner/repo and drops any credentials.
func displayRemote(u string) string {
	u = strings.TrimSpace(u)
	if i := strings.Index(u, "://"); i >= 0 {
		u = u[i+3:]
		if at := strings.Index(u, "@"); at >= 0 && at < strings.Index(u+"/", "/") {
			u = u[at+1:]
		}
	} else if i := strings.Index(u, ":"); i > 0 {
		// scp-like git@host:owner/repo
		u = u[:i] + "/" + u[i+1:]
		if at := strings.Index(u, "@"); at >= 0 && at < strings.Index(u, "/") {
			u = u[at+1:]
		}
	}
	return strings.TrimSuffix(strings.TrimSuffix(u, "/"), ".git")
}

// NewProjectMD is the initial Project.md for a fresh instance.
func NewProjectMD(repos []RepoInfo) string {
	var b strings.Builder
	b.WriteString("# Project\n\n")
	b.WriteString(RenderTable(repos))
	b.WriteString("\n\n## Overview\nWhat this set of repositories builds, in a few sentences.\n\n## Repositories\n")
	for _, r := range repos {
		b.WriteString(stub(r))
	}
	b.WriteString("\n## Cross-repo workflows\nHow a change typically flows across repositories.\n\n## Notes\nDurable gotchas and decisions. Mark unverified items.\n")
	return b.String()
}

func stub(r RepoInfo) string {
	purpose := strings.TrimSpace(r.Description)
	if purpose == "" {
		purpose = "…"
	}
	return fmt.Sprintf("### %s\n- Purpose: %s\n- Build/test: …\n- Relationships: …\n\n", r.Checkout.GetName(), purpose)
}

var (
	headingRe = regexp.MustCompile(`(?m)^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$`)
	h1Re      = regexp.MustCompile(`(?m)^# .*$`)
)

// UpdateProjectMD regenerates the managed table and appends stubs for checkouts without a `### <repo>` entry
// under "## Repositories". Everything else is left byte-for-byte as it was.
func UpdateProjectMD(doc string, repos []RepoInfo) string {
	table := RenderTable(repos)
	start := strings.Index(doc, blockStartPrefix)
	end := strings.Index(doc, BlockEnd)
	switch {
	case start >= 0 && end > start:
		doc = doc[:start] + table + doc[end+len(BlockEnd):]
	default:
		// No (or a broken) block: insert after the first H1, or at the top.
		if loc := h1Re.FindStringIndex(doc); loc != nil {
			doc = doc[:loc[1]] + "\n\n" + table + "\n\n" + strings.TrimLeft(doc[loc[1]:], "\n")
		} else {
			doc = "# Project\n\n" + table + "\n\n" + doc
		}
	}

	// Find "## Repositories" and its extent.
	secStart, secEnd := -1, len(doc)
	for _, m := range headingRe.FindAllStringSubmatchIndex(doc, -1) {
		level := m[3] - m[2]
		title := strings.TrimSpace(doc[m[4]:m[5]])
		if secStart < 0 {
			if level == 2 && strings.EqualFold(title, "Repositories") {
				secStart = m[1]
			}
			continue
		}
		if level <= 2 {
			secEnd = m[0]
			break
		}
	}
	existing := map[string]bool{}
	if secStart >= 0 {
		for _, m := range headingRe.FindAllStringSubmatchIndex(doc[secStart:secEnd], -1) {
			if m[3]-m[2] == 3 {
				existing[strings.ToLower(strings.TrimSpace(doc[secStart+m[4]:secStart+m[5]]))] = true
			}
		}
	}
	var stubs strings.Builder
	for _, r := range repos {
		if !existing[strings.ToLower(r.Checkout.GetName())] {
			stubs.WriteString(stub(r))
		}
	}
	if stubs.Len() == 0 {
		return doc
	}
	if secStart < 0 {
		if !strings.HasSuffix(doc, "\n") {
			doc += "\n"
		}
		return doc + "\n## Repositories\n" + stubs.String()
	}
	before := strings.TrimRight(doc[:secEnd], "\n") + "\n"
	if strings.TrimSpace(doc[secStart:secEnd]) != "" {
		before += "\n"
	}
	after := doc[secEnd:]
	return before + stubs.String() + after
}

// AgentsMD is the home-directory instruction file (section 4.2b), read natively by Codex, OpenCode and Pi, and by
// Claude and Gemini through the CLAUDE.md / GEMINI.md symlinks.
const AgentsMD = `# Plural DevBox

You are working in a Plural DevBox: a sandbox whose home directory (~) holds every repository of this project as
sibling checkouts.

1. Read ~/Project.md before starting work, to learn which repositories exist and how they relate.
2. Every repository lives at ~/<repo>. To work on one that isn't there, clone it with ` + "`git clone <url> ~/<repo>`" + `.
   Never clone elsewhere (not under /tmp, not inside another repository), and never nest repositories.
3. After cloning a repository, or learning something durable about one, update its entry in ~/Project.md: what it
   is for, how to build and test it, and how it relates to the others.
4. Keep ~/Project.md a concise, current map, not a log: edit entries in place, remove what's stale, and mark
   guesses as unverified. Never record secrets, tokens or customer data. Don't edit the table between the
   devbox:repos markers; the sandbox maintains it.
5. Put cross-repo knowledge in ~/Project.md and repo-specific knowledge in that repository's own AGENTS.md, if it
   should be committed.

Network access goes through an egress gateway that injects credentials: don't configure tokens or API keys
yourself. Cloning a repository that isn't allowlisted fails with HTTP 403; report it instead of working around it.
`
