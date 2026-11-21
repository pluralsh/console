package gitutil

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// DiffStat sizes a branch the way its pull request will: head against its merge base with base.
type DiffStat struct {
	Additions, Deletions, Files int
	BaseSHA, HeadSHA            string
}

// BranchDiffStat diffs head against its merge base with base. The remote's base is preferred, since a local base
// branch may be stale; head resolves locally first, as it's the branch the agent just pushed.
func BranchDiffStat(ctx context.Context, dir, base, head string) (*DiffStat, error) {
	baseSHA, err := commit(ctx, dir, "origin/"+base, base)
	if err != nil {
		return nil, fmt.Errorf("base branch %s: %w", base, err)
	}
	headSHA, err := commit(ctx, dir, head, "origin/"+head)
	if err != nil {
		return nil, fmt.Errorf("head branch %s: %w", head, err)
	}
	out, err := runString(ctx, dir, "diff", "--numstat", baseSHA+"..."+headSHA, "--")
	if err != nil {
		return nil, err
	}
	st := &DiffStat{BaseSHA: baseSHA, HeadSHA: headSHA}
	for row := range strings.SplitSeq(out, "\n") {
		fields := strings.Fields(row)
		if len(fields) < 3 {
			continue
		}
		st.Files++
		// binary files report "-" for both counts
		add, aerr := strconv.Atoi(fields[0])
		del, derr := strconv.Atoi(fields[1])
		if aerr == nil && derr == nil {
			st.Additions += add
			st.Deletions += del
		}
	}
	return st, nil
}

func commit(ctx context.Context, dir string, refs ...string) (string, error) {
	var err error
	for _, ref := range refs {
		var sha string
		if sha, err = runString(ctx, dir, "rev-parse", "--verify", "--quiet", ref+"^{commit}"); err == nil && sha != "" {
			return sha, nil
		}
	}
	if err == nil {
		err = fmt.Errorf("no such ref")
	}
	return "", err
}
