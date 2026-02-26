# Extending `kas` or `agentk` with new functionality

Functionality is grouped into modules. Each module has a server and an agent part, both are optional, depending on the needs of the module. Parts are called "server module" and "agent module" for simplicity.

Each module has a unique name that is used to identify it for API access, if needed.

## Structure

A module lives under `internal/module/{module name}`. Each module may contains one or two parts in separate directories: `server` and `agent`. Any code, that needs to be shared between server and agent modules, may be placed directly in the module's directory or a separate subdirectory.

Code for server and agent modules must be in separate directories (i.e. Go packages) to avoid adding unnecessary dependencies from one to the other. That way server module's libraries don't leak into agent module package and vice versa. `kas` must only depend on server modules and `agentk` must only depend on agent modules.

Modules may share code via separate packages but must not depend on each other directly. `internal/module/{module A}` (and any subdirectories) can depend on `internal/module/{module B}/some_shared_package`.

## Server module

API for module's server part is defined in the [`internal/module/modserver`](/pkg/module/modserver) directory.

### Responsibilities

- Validates and applies defaults to the corresponding part of the `kas` configuration.
- Optionally registers gRPC services on the gRPC server that `agentk` talks to.
- Optionally registers gRPC services on the gRPC server that Plural backend services (including the `api` module) talk to.
- Implements the required functionality.

## Agent module

API for module's agent part is defined in [`internal/module/modagent`](/pkg/module/modagent) directory.

### Responsibilities

- Validates and applies defaults to the corresponding part of the `agentk` configuration.
- Optionally registers gRPC services on the gRPC server that `kas` talks to. See [`kas` request routing](kas_request_routing.md).
- Implements the required functionality.

### Making requests to Plural

To make requests to Plural an agent module may use `MakePluralRequest()` method on the `modagent.API` object. Using a dedicated method rather than making a REST request directly is beneficial for the following reasons:

- Adds an indirection point that allows `agentk` to inject any necessary interceptors for tracing, monitoring, rate limiting, etc. In general this ensures all requests are made in a uniform manner.
- Modules don't have to deal with authentication and agent token handling, which is a secret. Reducing the exposure of the token within the program improves security because the chance of token leaking is reduced.
- All traffic originating from all agents uses a single entrypoint - `kas`. Benefits:

  - It makes it possible to expose only the `kas` domain and not the rest of Plural in a case where Plural is deployed as a self-managed instance with the Kubernetes cluster being in a cloud.
  - `kas` performs rate-limiting, monitoring, etc across the board for all Plural access originating from all the agents.

## Backend-for-frontend API module

In addition to `kas` and `agentk`, this repository contains an `api` module under `modules/api` which acts as a
backend-for-frontend for Kubernetes features in Plural UIs. It:

- Exposes a Plural-facing API tailored for frontend use cases.
- Talks to `kas` using the same gRPC endpoints as other backend services.
- Encapsulates kas/agent routing and authorization details behind a simpler API surface.

When extending the system with new cluster-facing capabilities, you will often:

1. Add or extend a **server module** and **agent module** to implement the actual behavior over the kas/agentk tunnel.
2. Optionally add endpoints in the `api` module to expose that behavior as a frontend-friendly API.
