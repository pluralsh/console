# Docker / OCI registry workbench tool setup

This integration lets Workbench agents inspect Docker and OCI registries. Agents can search tags for a repository and fetch a tag manifest.

## Registry URL

- **Registry URL** — Optional. Defaults to Docker Hub (`registry-1.docker.io`).
- For Docker Hub, use `registry-1.docker.io`.
- For GitHub Container Registry, use `ghcr.io`.
- For a private registry, use its registry host, for example `registry.example.com`.

Repository slugs are supplied when the agent calls a tool. Examples include:

- `library/nginx`
- `pluralsh/console`
- `my-team/my-image`

## Authentication

Choose one authentication mode:

### Public / no credentials

Leave the authentication fields empty. This works for public repositories and registries that allow anonymous reads.

### Basic auth

Use **Basic auth** when the registry expects a username and password or a username and token.

1. Enter the registry username.
2. Enter the password, access token, or registry token in **Password / token**.

### Bearer token

Use **Bearer token** when the registry accepts a pre-issued bearer token directly.

1. Generate or copy a registry token with read access to the repositories you want agents to inspect.
2. Paste it into **Bearer token**.

## Optional proxy

If Console must reach the registry through an HTTP proxy, set **Proxy URL**. Use **No proxy** for comma-separated hosts or domains that should bypass the proxy.

Examples:

- `localhost,127.0.0.1`
- `.svc,.cluster.local,registry.internal.example.com`

## Notes

- Tag search is performed by listing tags and filtering them in memory.
- Manifest fetch works for Docker and OCI image manifests, including multi-architecture manifest lists.
