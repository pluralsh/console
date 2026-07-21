---
name: console-tests
description: Run and interpret tests in the Console Elixir repo. Use when validating changes with `mix test`, running Docker integration tests, diagnosing sandbox network failures, or explaining Console test setup in Cursor.
---

# Console Tests

Use this skill when validating changes in the Console repo.

## Sandbox Requirements

- Run `mix test` commands from the repo root: `/Users/michaelguarino/code/console`.
- The default Cursor sandbox blocks some domains the Console app touches during startup and test aliases.
- Use `required_permissions: ["full_network"]` for `mix test` runs that need the normal project setup.
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


## Interpreting Failures

- A focused test passing is good validation for narrow changes, especially when the full suite is known to depend on external/local fixtures.
- Full-suite failures like `could not resolve ref main` or `could not resolve ref master` usually indicate git fixture/ref setup problems unless the touched code is in that path.
- Report full-suite failures honestly, but separate environment/fixture failures from failures in the files being changed.

## Validation Checklist

- [ ] Run the most relevant focused test file with `full_network` if it uses project startup or external services.
- [ ] Run the full suite with `full_network` when requested or when the change has broad impact.
- [ ] Read the final ExUnit summary and any failure blocks for touched modules.
- [ ] Run `ReadLints` on changed files after edits.
