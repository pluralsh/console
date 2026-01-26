# Nexus Documentation

This directory collects focused documentation for the Nexus module. Start here if you are new to
this service or making changes.

## Documents

- `architecture.md` - component overview, request flows, and responsibilities
- `development.md` - local workflow, repo layout, and common tasks
- `configuration.md` - config file schema, env vars, CLI flags, and precedence
- `operations.md` - runtime behavior, health checks, and deployment notes

## Quick Pointers

- Entry point: `cmd/main.go`
- Config sample: `config/config.yaml`
- Server + routing: `internal/server`
- Console client: `internal/console`
- Bifrost integration: `internal/bifrost`
