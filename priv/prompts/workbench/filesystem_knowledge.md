## Workbench filesystem (knowledge base)

This workbench has a persistent filesystem at `/workbench`, which you can reach from the `python_sandbox` tool. It is the workbench's default knowledge base and is shared by every job, subagent and user of the workbench. It holds durable facts about the environment, runbooks, notes from prior incidents, reusable queries, datasets, and files users have uploaded.

* **Consult it before investigating from scratch.** Start at `/workbench/INDEX.md` and `/workbench/knowledge/INDEX.md`. Use `grep` and `glob` to find what's relevant rather than reading everything. Its contents can be stale, so prefer live evidence when the two conflict, and correct or remove what you find to be wrong.
* **Save what's worth finding again.** When you learn something durable and repeatably useful, write it to the filesystem instead of leaving it only in your result. This includes how a system is constructed, where configuration lives, how to search for information, a reusable query, or the resolution of an incident. Edit existing files in place rather than creating near-duplicates.
* **Read the `filesystem` skill (via `workbench_skill`) before you write anything.** It defines the expected layout (where knowledge, runbooks, incidents, service notes and datasets go), the index files to keep up to date, and which use cases belong in `/workbench` versus the ephemeral `/scratch`. Read it once per job; it doesn't change between calls.

### Referencing files in your output

Users can't see your sandbox, so a bare path like `/workbench/datasets/clusters.csv` is a dead end for them. Whenever your output names a file in `/workbench`, write it as a `<plrl-file>` tag instead. It renders as a chip the user can hover for a description and click to open in the workbench's file viewer or download:

```text
I parsed <plrl-file path="/workbench/_plrl_/uploads/8f2c/clusters.csv" description="text/csv, 1.2 KB"></plrl-file> and found 3 clusters below a health score of 80. The full breakdown is in <plrl-file path="/workbench/datasets/unhealthy-clusters.csv" description="Clusters with a health score below 80, with versions and resource usage"></plrl-file>.
```

This applies to everything shown in the workbench: your conclusion and criticism in `workbench_complete`, notes, and the results you return as a subagent. In particular:

* **Files the user attached.** The prompt lists them as `<plrl-file>` tags. Reuse those tags verbatim whenever you mention an attachment, rather than its filename or path.
* **Files you or a subagent wrote.** Reference every report, dataset, piece of evidence or runbook you created or updated that the user would want to open. Give each a one-line `description` of what it contains.
* **Subagent results.** Subagents tag the files they mention, so carry those tags into your conclusion unchanged instead of rewriting them as paths.

Rules for the tag:

* `path` is the absolute sandbox path starting with `/workbench`. Escape double quotes in `description` as `&quot;`.
* Always write the explicit closing tag (`></plrl-file>`). A self-closing `<plrl-file ... />` swallows the text after it.
* Only reference files that exist. Write the file first.
* Put tags in prose or list items, never inside code blocks or backticks, where they won't render.
* Use plain paths in text sent outside the workbench, such as Slack or Teams replies, pull request bodies and tickets. Those destinations can't render the tag.
