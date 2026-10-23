The `python_sandbox` tool runs Monty, a restricted Python without `glob`, recursive directory walks, or the `csv`, `yaml`, `zipfile` and `tarfile` modules. These builtin functions fill those gaps. They're always in scope, so call them directly without importing anything.

Every function works on the persistent workbench filesystem under `/workbench`, and raises a normal Python exception (`FileNotFoundError`, `ValueError`, `TypeError`, ...) on failure. Paths are absolute, and relative paths resolve against `/workbench`. Functions that read a file also accept a `text` string instead of a `path`, which is how to parse content from `/scratch` or from another tool's output:

```python
from pathlib import Path
read_csv(text=Path("/scratch/export.csv").read_text())
```

## Searching

### `glob(pattern, max_results=1000)`

Matches an absolute glob pattern, supporting `*`, `?`, `[abc]`, `**` (any number of directories) and `{a,b}` alternation. Returns a list of dicts with `path`, `name` and `kind` (`"file"` or `"directory"`).

```python
[f["path"] for f in glob("/workbench/incidents/2026-*/summary.md")]
glob("/workbench/**/*.{yaml,yml}", max_results=50)
```

### `grep(pattern, path="/workbench", fixed_string=False, case_insensitive=False, before_context=0, after_context=0, max_matches=200)`

Searches for a regular expression (Rust regex syntax, or a literal string with `fixed_string=True`). `path` may be a file, a directory (searched recursively) or a glob pattern. Binary and very large files are skipped. Returns a list of dicts with:

- `path`, `line_number` and `line`;
- `before` and `after`: lists of `{"line_number": ..., "text": ...}` context lines.

```python
hits = grep("OOMKilled", path="/workbench/incidents", case_insensitive=True, after_context=2)
[(h["path"], h["line_number"], h["line"]) for h in hits]
```

Prefer `glob` and `grep` over reading many files when you only need to locate something.

## CSV and TSV

### `read_csv(path=None, text=None, delimiter=None, header=True, max_rows=10000)`

Parses csv or tsv, handling quoted cells, embedded delimiters and newlines, and the byte order mark that spreadsheet exports often start with. The delimiter defaults to a tab for `.tsv` and `.tab` files, and a comma otherwise. Pass `delimiter=";"` (or any single character) for other formats.

Cells are always strings, so convert numbers yourself, and treat empty strings as missing values. Returns a dict with:

- `columns`: the header row, or `None` when `header=False`.
- `rows`: dicts keyed by column name, or lists of cells when `header=False`. Rows shorter than the header are padded with `None`, and any extra cells are collected in a list under `"_extra"`.
- `row_count`: the total number of data rows in the file, excluding the header.
- `truncated`: `True` when there were more than `max_rows` rows, in which case only the first `max_rows` are returned. Pass `max_rows=None` to return them all.
- `errors`: messages for up to 10 malformed rows (such as an unterminated quote) that were skipped.

```python
data = read_csv("/workbench/_plrl_/uploads/<id>/clusters.csv")
unhealthy = [
    r["name"] for r in data["rows"]
    if r["health_score"] and int(r["health_score"]) < 80
]
{"columns": data["columns"], "rows": data["row_count"], "unhealthy": unhealthy}
```

### `write_csv(path, rows, columns=None, delimiter=None)`

Writes `rows`, a list of dicts or a list of lists, as a csv file, replacing any existing file. Returns the written path.

- For dict rows, `columns` defaults to every key in the order first seen, and missing keys become empty cells. Pass `columns` to choose and order them.
- For list rows, a header row is written only when `columns` is given.
- `None` is written as an empty cell, booleans as `True`/`False`, and lists or dicts as JSON.
- The delimiter defaults to a tab for `.tsv` and `.tab` paths, and a comma otherwise.

```python
write_csv(
    "/workbench/datasets/unhealthy-clusters.csv",
    [{"name": n, "health_score": s} for n, s in scores],
    columns=["name", "health_score"],
)
```

## YAML

### `read_yaml(path=None, text=None)`

Parses yaml and always returns a list of its documents, with one entry per `---` separated document. Empty documents are empty dicts. Mappings become dicts and sequences become lists. Timestamps stay strings.

```python
docs = read_yaml("/workbench/_plrl_/uploads/<id>/manifests.yaml")
[(d["kind"], d["metadata"]["name"]) for d in docs if d]

values = read_yaml(text=helm_values)[0]
```

## Archives

### `extract_archive(path, destination=None)`

Unpacks a `.zip` or uncompressed `.tar` archive into the filesystem, overwriting existing files with the same names. Compressed tarballs (`.tar.gz`, `.tgz`) and standalone `.gz` files aren't supported. If the user needs one of those unpacked, ask them to attach a zip instead.

- `destination` defaults to a directory next to the archive named after it, so `/workbench/_plrl_/uploads/<id>/bundle.zip` unpacks into `/workbench/_plrl_/uploads/<id>/bundle/`.
- Only regular files are extracted. Absolute paths and `..` segments are stripped, so entries can't escape the destination, and macOS metadata (`__MACOSX`, `.DS_Store`) is skipped.
- Archives may be at most 100MB, and may contain at most 1,000 files totalling 100MB uncompressed.

Returns a dict with `destination`, `files` (the extracted paths), `file_count` and `total_bytes`.

```python
out = extract_archive("/workbench/_plrl_/uploads/<id>/support-bundle.zip")
logs = [f for f in out["files"] if f.endswith(".log")]
grep("panic|fatal", path=out["destination"], case_insensitive=True, max_matches=50)
```
