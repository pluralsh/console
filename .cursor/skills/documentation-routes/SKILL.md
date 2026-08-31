---
name: documentation-routes
description: Regenerates documentation route metadata. Use whenever creating, editing, moving, renaming, or deleting documentation content, or when changing the documentation navigation and redirects.
---

# Documentation Routes

After adding or updating any documentation content, run this command from `documentation/`:

```bash
make routes
```

Run it for content-only edits as well as page additions, deletions, moves, navigation changes, and redirect changes.

Review `documentation/generated/routes.json` after the command finishes and include its relevant changes with the documentation update. If route generation fails, fix the failure and rerun `make routes` before completing the task.
