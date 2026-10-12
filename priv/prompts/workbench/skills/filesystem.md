This workbench has a persistent filesystem, shared by every job in the workbench and by the users who manage it. Treat it as the workbench's long-term working memory and library: anything worth finding again belongs here, organized so that a future agent with no context can navigate it by listing directories and reading a few short index files.

## Accessing it

The filesystem is mounted at `/workbench` inside the `python_sandbox` tool. `/scratch` is a separate, throwaway directory that disappears after each sandbox call, so use it only for intermediate work.

Standard `pathlib` and `open()` work on any path under `/workbench`:

```python
from pathlib import Path

root = Path("/workbench")

# reading
text = (root / "runbooks/INDEX.md").read_text()
data = (root / "datasets/latency.json").read_bytes()
exists = (root / "incidents").is_dir()
size = (root / "datasets/latency.json").stat().st_size

# listing a directory (non-recursive)
children = sorted(str(p) for p in (root / "incidents").iterdir())

# writing (parent directories are created automatically)
(root / "incidents/2026-10-11-checkout-latency/summary.md").write_text("# Checkout latency\n...")

# appending, e.g. to a running log
with open("/workbench/incidents/2026-10-11-checkout-latency/timeline.md", "a") as f:
    f.write("- 14:02 UTC rollback of checkout-api v1.42 completed\n")

# reorganizing
(root / "notes/draft.md").rename("/workbench/runbooks/payments/stuck-refunds.md")
(root / "tmp/old.txt").unlink()
(root / "tmp").rmdir()  # directories must be empty to remove
```

Two extra functions cover what `pathlib` can't do in the sandbox:

- `glob(pattern, max_results=1000)` matches an absolute pattern supporting `*`, `?`, `[abc]`, `**` (any depth) and `{a,b}`. It returns dicts with `path`, `name` and `kind` (`"file"` or `"directory"`).
- `grep(pattern, path="/workbench", fixed_string=False, case_insensitive=False, before_context=0, after_context=0, max_matches=200)` searches a file, a directory (recursively) or a glob for a regex. It returns dicts with `path`, `line_number`, `line`, `before` and `after`.

```python
# find every runbook mentioning a service, with a line of context
hits = grep("checkout-api", path="/workbench/runbooks/**/*.md", case_insensitive=True, before_context=1, after_context=1)
[(h["path"], h["line_number"], h["line"]) for h in hits]

# locate files by shape rather than reading directories one at a time
[f["path"] for f in glob("/workbench/incidents/2026-*/summary.md")]
```

The sandbox's final expression is its result and must be JSON encodable, so return paths and short excerpts rather than whole files. Read large files selectively, for example by using `grep` to find the relevant lines first.

## Files from users

Files attached to prompts are uploaded to `/workbench/_plrl_/uploads/<id>/<filename>`, and the prompt lists their exact paths. Everything under `/workbench/_plrl_` is managed by Plural:

- Read from it freely, but don't write, move or delete anything there unless the user asks.
- If an upload should become part of the workbench's library, copy what matters into a well-named location elsewhere and reference the original path.

## Laying out the filesystem

Before writing, look at what already exists (`iterdir` on the root, read any `INDEX.md` or `README.md`) and extend the existing structure rather than inventing a parallel one.

**Make paths semantically rich.** A future agent should be able to guess where something lives, and what a file contains, from the path alone:

- Group by durable concepts (the kind of artifact, then the system, team or domain it concerns), not by the job or date that produced it. For example, `runbooks/payments/stuck-refunds.md` and `services/checkout-api/architecture.md` are better than `job-123/notes.md`.
- Use dates where chronology matters, as sortable prefixes: `incidents/2026-10-11-checkout-latency/`.
- Use lowercase, hyphenated, descriptive names: `p99-latency-by-region.csv` rather than `data2.csv`. Avoid generic names like `misc`, `stuff`, `output` or `temp` outside `/scratch`.
- Keep directories reasonably sized. When one grows past a few dozen entries, split it into meaningful subdirectories.

A typical layout might look like:

```text
/workbench
├── INDEX.md                      # what lives where, one line per top-level directory
├── runbooks/
│   ├── INDEX.md
│   └── payments/stuck-refunds.md
├── services/
│   └── checkout-api/
│       ├── README.md             # overview, owners, dependencies, links to the files below
│       ├── architecture.md
│       └── known-issues.md
├── incidents/
│   └── 2026-10-11-checkout-latency/
│       ├── summary.md
│       ├── timeline.md
│       └── evidence/p99-latency-by-region.csv
└── datasets/
```

**Use docs for progressive disclosure.** Rather than one huge document, write short entry points that summarize and link to detail:

- Keep an `INDEX.md` (or `README.md`) at the root and in each major directory. Give a one-line description of each child file or directory, and say when to read it.
- Start long documents with a short summary. Link out to supporting files by absolute path (for example "raw measurements: `/workbench/incidents/2026-10-11-checkout-latency/evidence/p99-latency-by-region.csv`") instead of inlining them.
- When you add, move or delete files, update the index entries that reference them in the same sandbox call, so links don't rot.

This lets a future reader start at `/workbench/INDEX.md` and drill down only into what's relevant, instead of reading everything.

**Prefer durable, reusable artifacts.** Write findings, decisions, runbooks, reusable queries and datasets that will help future jobs. Don't dump raw tool output. When you update an existing document, edit it in place so it stays current, rather than creating `-v2` copies, and note what changed and when if history matters.
