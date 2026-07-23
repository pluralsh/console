---
name: console-tests
description: Run and interpret tests in the Console repo. Use when validating changes with `mix test`, running deployment-operator Go tests, diagnosing sandbox/toolchain/network failures, or explaining Console test setup in Cursor.
---

# Console Tests

Use this skill when validating changes in the Console repo.

## Sandbox Requirements

- Run `mix test` commands from the repo root: `/Users/michaelguarino/code/console`.
- Run deployment-operator Go commands from `/Users/michaelguarino/code/console/go/deployment-operator`.
- The default Cursor sandbox blocks some domains the Console app touches during startup and test aliases.
- Use `required_permissions: ["full_network"]` for `mix test` runs that need the normal project setup.
- For Go tests, explicitly set Go caches inside the workspace when running in the sandbox:

```bash
cd /Users/michaelguarino/code/console/go/deployment-operator && \
GOPATH=/Users/michaelguarino/code/console/.go \
GOCACHE=/Users/michaelguarino/code/console/.cache/go-build \
go test ./pkg/controller/service
```

- Use `required_permissions: ["full_network"]` for Go tests when dependencies or the configured Go toolchain need to download. If Go still fails writing to `/Users/michaelguarino/go/pkg/...`, rerun with the in-workspace `GOPATH`/`GOCACHE` above before requesting `all`.
- Do not run `mix format` in this repository.

## Why Full Network Is Needed

The `mix test` alias runs setup before ExUnit:

```elixir
test: ["ecto.create --quiet", "agent.chart", "ecto.migrate", "elasticsearch.down", "elasticsearch.up", "test"]
```

That setup can fetch external resources:

- App startup may request `app.plural.sh` and `assets.plural.sh`.
- `agent.chart` downloads a deployment-operator chart from GitHub releases.
- Docker integration tests contact Docker Hub/OCI registry endpoints.

If a sandboxed run fails with `Blocked by sandbox network policy`, `Req.TransportError`, `non-existing domain`, or `:proxy_error`, retry the same test command with `full_network` before treating it as a code failure.

## Useful Commands

Full suite:

```bash
mix test
```

Focused deployment-operator service package:

```bash
cd /Users/michaelguarino/code/console/go/deployment-operator && \
GOPATH=/Users/michaelguarino/code/console/.go \
GOCACHE=/Users/michaelguarino/code/console/.cache/go-build \
go test ./pkg/controller/service
```

Format changed deployment-operator Go files:

```bash
cd /Users/michaelguarino/code/console/go/deployment-operator && \
gofmt -w pkg/controller/service/reconciler.go pkg/manifests/tarball.go
```


## Interpreting Failures

- A focused test passing is good validation for narrow changes, especially when the full suite is known to depend on external/local fixtures.
- Full-suite failures like `could not resolve ref main` or `could not resolve ref master` usually indicate git fixture/ref setup problems unless the touched code is in that path.
- Go failures like `go.work requires go >= 1.26.5` can mean the IDE/linter is using an older local Go. A shell `go test` may still work through Go's auto toolchain download when network and cache permissions are set correctly.
- Sandbox errors writing under `/Users/michaelguarino/go/pkg/sumdb` indicate the Go module/toolchain cache is outside the writable workspace. Prefer setting `GOPATH` and `GOCACHE` inside `/Users/michaelguarino/code/console`.
- Report full-suite failures honestly, but separate environment/fixture failures from failures in the files being changed.

## Validation Checklist

- [ ] Run the most relevant focused test file with `full_network` if it uses project startup or external services.
- [ ] For deployment-operator Go changes, run `gofmt -w` on touched files from the module directory.
- [ ] For deployment-operator Go tests, `cd` into `go/deployment-operator` and use in-workspace `GOPATH`/`GOCACHE` when sandboxed.
- [ ] Run the full suite with `full_network` when requested or when the change has broad impact.
- [ ] Read the final ExUnit summary and any failure blocks for touched modules.
- [ ] Run `ReadLints` on changed files after edits.
