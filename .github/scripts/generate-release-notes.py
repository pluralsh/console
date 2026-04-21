#!/usr/bin/env python3
"""
Generate deep patch notes for console release from merged PRs between two git tags.

Extracts PR descriptions (not just titles) and categorizes them using the
same label scheme as .github/release.yml. Optionally summarizes long
descriptions via the OpenAI API when OPENAI_API_KEY is set.
"""

import argparse
import json
import os
import re
import subprocess
import sys

CATEGORIES = [
    ("Breaking Changes ⚠️", {"breaking-change"}),
    ("New Features 🎉", {"enhancement"}),
    ("Bug Fixes 🐛", {"bug-fix"}),
    ("Dependency Updates", {"dependencies"}),
]

EXCLUDED_LABELS = {"ignore-for-release"}

REPO = os.environ.get("GITHUB_REPOSITORY", "pluralsh/console")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ⚠ command failed: {' '.join(cmd)}", file=sys.stderr)
        print(f"    {result.stderr.strip()}", file=sys.stderr)
        return ""
    return result.stdout.strip()


def is_release_tag(tag):
    """Match only bare release tags like v0.12.0, not chart tags like foo-chart-v0.1.1."""
    return bool(re.fullmatch(r"v\d+\.\d+\.\d+", tag))


def get_previous_tag(current_tag):
    """Return the release tag immediately before current_tag in version order."""
    raw = run(["git", "tag", "--sort=-v:refname"])
    if not raw:
        return None
    tags = [t for t in raw.splitlines() if is_release_tag(t)]
    try:
        idx = tags.index(current_tag)
    except ValueError:
        return None
    return tags[idx + 1] if idx + 1 < len(tags) else None


# ---------------------------------------------------------------------------
# PR collection
# ---------------------------------------------------------------------------

def collect_pr_numbers(base_tag, head_tag):
    """Return PR numbers from merge commits and squash-merge subjects."""
    pr_nums: set[str] = set()

    log = run([
        "git", "log", f"{base_tag}..{head_tag}",
        "--first-parent", "--format=%s",
    ])
    for line in log.splitlines():
        m = re.search(r"Merge pull request #(\d+)", line)
        if m:
            pr_nums.add(m.group(1))
        m = re.search(r"\(#(\d+)\)\s*$", line)
        if m:
            pr_nums.add(m.group(1))

    return pr_nums


def fetch_pr_details(pr_numbers):
    prs = []
    for num in sorted(pr_numbers, key=int):
        raw = run([
            "gh", "pr", "view", num,
            "--json", "number,title,body,labels,author,url",
        ])
        if raw:
            prs.append(json.loads(raw))
    return prs


# ---------------------------------------------------------------------------
# Description extraction
# ---------------------------------------------------------------------------

def extract_description(body):
    """Pull the meaningful human-written section from a PR body."""
    if not body:
        return ""

    text = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)

    for marker in ("## Test Plan", "## Checklist", "## test plan", "## checklist"):
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]

    text = re.sub(r"Plural Flow:.*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


# ---------------------------------------------------------------------------
# Optional LLM summarisation
# ---------------------------------------------------------------------------

def summarize_prs(prs):
    """If OPENAI_API_KEY is set, ask an LLM to tighten each description."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {}

    import urllib.request

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    summaries: dict[int, str] = {}

    for pr in prs:
        desc = extract_description(pr.get("body", ""))
        title = pr.get("title", "")
        if not desc or len(desc) < 30:
            continue

        prompt = (
            "Summarize this pull request in 1-2 concise sentences for a "
            "release note.  Focus on what changed and why it matters to "
            "users.  Do not start with 'This PR …'.\n\n"
            f"Title: {title}\n\nDescription:\n{desc[:3000]}"
        )

        payload = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 150,
            "temperature": 0.3,
        }).encode()

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
                summary = result["choices"][0]["message"]["content"].strip()
                summaries[pr["number"]] = summary
        except Exception as exc:
            print(f"  ⚠ LLM call failed for #{pr['number']}: {exc}", file=sys.stderr)

    return summaries


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def label_names(pr):
    return {l.get("name", "") for l in pr.get("labels", [])}


def categorize(prs):
    buckets: dict[str, list] = {name: [] for name, _ in CATEGORIES}
    buckets["Other Changes"] = []

    for pr in prs:
        labels = label_names(pr)
        if labels & EXCLUDED_LABELS:
            continue

        placed = False
        for cat_name, cat_labels in CATEGORIES:
            if labels & cat_labels:
                buckets[cat_name].append(pr)
                placed = True
                break

        if not placed:
            buckets["Other Changes"].append(pr)

    return buckets


def format_entry(pr, summary=None):
    title = pr.get("title", "")
    number = pr["number"]
    url = pr.get("url", f"https://github.com/{REPO}/pull/{number}")
    author = pr.get("author", {}).get("login", "")

    desc = summary or extract_description(pr.get("body", ""))

    line = f"* **{title}** ([#{number}]({url}))"
    if author:
        line += f" by @{author}"

    if desc:
        quoted = "\n".join(f"  > {s}" for s in desc.splitlines())
        line += f"\n\n{quoted}"

    line += "\n"
    return line


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate(current_tag, limit=None):
    prev_tag = get_previous_tag(current_tag)
    if not prev_tag:
        print("Could not determine previous tag", file=sys.stderr)
        sys.exit(1)

    print(f"Generating notes: {prev_tag} → {current_tag}", file=sys.stderr)

    pr_nums = collect_pr_numbers(prev_tag, current_tag)
    if not pr_nums:
        return f"# {current_tag}\n\nNo pull requests found in this release.\n"

    if limit:
        pr_nums = set(sorted(pr_nums, key=int, reverse=True)[:limit])

    print(f"Found {len(pr_nums)} PR(s)", file=sys.stderr)
    prs = fetch_pr_details(pr_nums)
    llm = summarize_prs(prs)
    buckets = categorize(prs)

    lines = []

    for cat_name, _ in CATEGORIES:
        entries = buckets.get(cat_name, [])
        if not entries:
            continue
        lines.append(f"## {cat_name}\n")
        for pr in entries:
            lines.append(format_entry(pr, llm.get(pr["number"])))
        lines.append("")

    other = buckets.get("Other Changes", [])
    if other:
        lines.append("## Other Changes\n")
        for pr in other:
            lines.append(format_entry(pr, llm.get(pr["number"])))
        lines.append("")

    compare = f"https://github.com/{REPO}/compare/{prev_tag}...{current_tag}"
    lines.append(
        f"**Full Changelog**: [{prev_tag}...{current_tag}]({compare})"
    )

    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate release notes")
    parser.add_argument("tag", nargs="?", default=os.environ.get("GITHUB_REF_NAME", ""),
                        help="Git tag to generate notes for")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max number of PRs to process (most recent first)")
    args = parser.parse_args()

    if not args.tag:
        parser.error("tag is required (positional arg or GITHUB_REF_NAME env var)")

    notes = generate(args.tag, limit=args.limit)

    out_path = os.environ.get("RELEASE_NOTES_FILE", "release-notes.md")
    with open(out_path, "w") as f:
        f.write(notes)

    print(notes)
