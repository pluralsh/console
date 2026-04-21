#!/usr/bin/env python3
"""
Generate deep patch notes for Plural Console releases.

For each PR merged between two tags, fetches the git diff and sends it to an
LLM to produce an accurate, user-facing summary.  Falls back to the PR body
description when OPENAI_API_KEY is not set.

Categories match .github/release.yml.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

CATEGORIES = [
    ("Breaking Changes ⚠️", {"breaking-change"}),
    ("New Features 🎉", {"enhancement"}),
    ("Bug Fixes 🐛", {"bug-fix"}),
    ("Dependency Updates", {"dependencies"}),
]

EXCLUDED_LABELS = {"ignore-for-release"}

REPO = os.environ.get("GITHUB_REPOSITORY", "pluralsh/console")
DOCS_REPO = "pluralsh/documentation"

DIFF_CHAR_LIMIT = 12_000

DOCS_PATHS = [
    "src/routing/docs-structure.ts",
    "pages/overview/introduction.md",
]

NOISY_PATTERNS = re.compile(
    r"(^package-lock\.json|^yarn\.lock|^pnpm-lock\.yaml|^mix\.lock"
    r"|^go\.sum|\.gen\.|/generated/|/__generated__/|\.snap$"
    r"|^assets/src/generated/)",
    re.MULTILINE,
)


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


def fetch_docs_context():
    """Fetch product documentation from the docs repo for LLM context."""
    parts = []
    for path in DOCS_PATHS:
        raw = run([
            "gh", "api",
            "-H", "Accept: application/vnd.github.raw+json",
            f"/repos/{DOCS_REPO}/contents/{path}",
        ])
        if raw:
            parts.append(f"### {path}\n{raw}")

    if not parts:
        print("  ⚠ Could not fetch docs context", file=sys.stderr)
        return ""

    return "\n\n".join(parts)


def is_release_tag(tag):
    return bool(re.fullmatch(r"v\d+\.\d+\.\d+", tag))


def get_previous_tag(current_tag):
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
# Diff retrieval
# ---------------------------------------------------------------------------

def filter_diff(diff_text):
    """Drop hunks for lockfiles, generated code, and snapshots."""
    filtered_hunks = []
    current_hunk = []
    skip = False

    for line in diff_text.splitlines(keepends=True):
        if line.startswith("diff --git"):
            if current_hunk and not skip:
                filtered_hunks.append("".join(current_hunk))
            current_hunk = [line]
            file_path = line.split(" b/")[-1].strip() if " b/" in line else ""
            skip = bool(NOISY_PATTERNS.search(file_path))
        else:
            current_hunk.append(line)

    if current_hunk and not skip:
        filtered_hunks.append("".join(current_hunk))

    return "".join(filtered_hunks)


def fetch_pr_diff(pr_number):
    """Return a filtered, truncated diff and a file list for a PR."""
    file_list = run(["gh", "pr", "diff", str(pr_number), "--name-only"])
    raw_diff = run(["gh", "pr", "diff", str(pr_number)])

    diff = filter_diff(raw_diff) if raw_diff else ""

    if len(diff) > DIFF_CHAR_LIMIT:
        diff = diff[:DIFF_CHAR_LIMIT] + "\n\n... (diff truncated) ..."

    return file_list, diff


# ---------------------------------------------------------------------------
# Fallback description extraction (no API key)
# ---------------------------------------------------------------------------

def extract_description(body):
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
# LLM summarisation
# ---------------------------------------------------------------------------

def llm_summarize(title, file_list, diff, api_key, model, docs_context=""):
    """Send the diff to the LLM and return a release-note summary."""
    import urllib.request

    system = (
        "You are writing release notes for the Plural Console. Use the product documentation below "
        "to understand the product's terminology, features, and architecture "
        "so your summaries are accurate and consistent.\n\n"
        + docs_context
    )

    prompt = (
        "Below is the title and git diff for a single pull request. Write a "
        "1-3 sentence summary suitable for a release note. Focus on *what* "
        "changed from the user's perspective and *why* it matters. Be specific "
        "about the feature or fix — avoid generic filler. Do not start with "
        "'This PR' or 'This change'.\n\n"
        f"## PR Title\n{title}\n\n"
        f"## Files Changed\n```\n{file_list}\n```\n\n"
        f"## Diff\n```diff\n{diff}\n```"
    )

    messages = []
    if docs_context:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": 200,
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

    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        return result["choices"][0]["message"]["content"].strip()


def _summarize_one(pr, api_key, model, docs_context):
    """Fetch diff and call LLM for a single PR. Returns (number, summary)."""
    number = pr["number"]
    title = pr.get("title", "")
    print(f"  #{number}: fetching diff …", file=sys.stderr)

    file_list, diff = fetch_pr_diff(number)
    if not diff:
        print(f"  #{number}: empty diff, skipping", file=sys.stderr)
        return number, None

    try:
        summary = llm_summarize(title, file_list, diff, api_key, model, docs_context)
        print(f"  #{number}: ✓ summarized", file=sys.stderr)
        return number, summary
    except Exception as exc:
        print(f"  #{number}: ⚠ LLM failed: {exc}", file=sys.stderr)
        return number, None


def summarize_prs(prs, api_key, model):
    """Generate LLM summaries from diffs, processing PRs concurrently."""
    print("Fetching product documentation for context …", file=sys.stderr)
    docs_context = fetch_docs_context()
    if docs_context:
        print(f"  ✓ loaded {len(docs_context)} chars of docs context", file=sys.stderr)

    summaries: dict[int, str] = {}
    workers = min(len(prs), 4)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_summarize_one, pr, api_key, model, docs_context): pr
            for pr in prs
        }
        for future in as_completed(futures):
            number, summary = future.result()
            if summary:
                summaries[number] = summary

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

    api_key = os.environ.get("OPENAI_API_KEY")
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    if api_key:
        print("LLM enabled — generating summaries from diffs", file=sys.stderr)
        llm = summarize_prs(prs, api_key, model)
    else:
        print("No OPENAI_API_KEY — falling back to PR body descriptions", file=sys.stderr)
        llm = {}

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
