---
name: console-graphql-codegen
description: Regenerates Console GraphQL schema, frontend artifacts, and the Go client after editing GraphQL schema or operation files. Use when changing files under go/client/graph, schema, lib/console/graphql, or GraphQL fragments and mutations.
---

# Console GraphQL Code Generation

## Required command

Properly generate the client using `make update-schema`.

Run it from the Console repository root:

```bash
cd /Users/michaelguarino/code/console && make update-schema
```

Do not run `make -C go/client generate` as a substitute. `update-schema` regenerates the schema and frontend artifacts before the Go client.

## Failure safety

1. Before generation, confirm `go/client/client.go` and `go/client/models_gen.go` exist.
2. Do not stage, commit, or push generated-file deletions after a failed generation.
3. If generation fails, inspect the reported error first. Resolve toolchain or network prerequisites, then rerun the required command.
4. Before committing, verify both generated Go files exist and review the diff:

```bash
test -f go/client/client.go
test -f go/client/models_gen.go
git diff -- go/client/client.go go/client/models_gen.go go/client/generated/persisted-queries/queries.json
```

## Validation

After a successful run, ensure the generated client reflects the edited operation and run the relevant tests or build checks.
