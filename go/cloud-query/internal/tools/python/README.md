# Sandboxed Python runner

This package provides the runner used by the `RunPython` service RPC with
Monty's limited Python subset. It is not CPython. The parent starts four copies
of `cloud-query python-worker` and communicates with them over private
stdin/stdout pipes. Each worker loads gomonty's embedded native library and
creates a fresh REPL for every request.

## Architecture

The root package is a facade for runner and worker construction, stable error
codes, and safe public error messages. Its implementation is split into four
private modules:

- `contract` owns execution types, fixed limits, validation, and errors.
- `protocol` owns strict version 1 framing and message validation.
- `worker` joins the request server to the Monty runtime.
- `pool` owns isolated subprocesses, queueing, recycling, and shutdown.

Dependencies flow inward: `pool` and `worker` use `protocol`; those modules use
`contract`; the root package joins them. Each worker receives a replacement
environment containing only `TMPDIR=/tmp` by default.

Errors have a stable code, a bounded public summary, and a private diagnostic
capped at 64 KiB. Use `PublicMessage` before returning an error to an untrusted
caller. Protocol data and process diagnostics must remain internal.

## Execution contract

Each run receives Python source and an optional JSON object. The object becomes
the global `input` dictionary. `output` starts as an empty dictionary and must
remain JSON serializable and object shaped. The response returns `output` and
the user script's standard output separately.

Workers receive only `TMPDIR=/tmp`. The host exposes UTC clock callbacks for
`datetime.now()` and `date.today()` only; `datetime.now()` returns a naive UTC
value, and non-UTC timezone arguments are rejected. It supplies no filesystem,
environment, network, subprocess, shell, package, external function, or
name-lookup capability.

Limits:

- Source: 64 KiB
- Input and result JSON: 1 MiB each
- Captured stdout: 64 KiB
- Private diagnostics: 64 KiB
- Monty execution: 60 seconds
- Parent wall clock: 65 seconds or the caller's earlier deadline
- Monty-managed memory: 100 MiB
- Recursion: 100 frames
- Active workers: 4
- Waiting requests: 16 by default
- Worker recycling: 10 successful requests

Monty's memory limit does not bound total worker or pod RSS. The parent provides
the hard crash and wall-time limit by killing and replacing a worker process.

## Private protocol

Protocol version 1 uses a four-byte big-endian length followed by strict JSON.
Frames are bounded before allocation, unknown fields and trailing JSON values
are rejected, and only `health` and `run` request kinds are accepted. Every
response must repeat the request ID and kind. Error responses carry a stable
code, a bounded sanitized public summary, and a separate bounded private
diagnostic. The parent validates and sanitizes the public summary again before
returning it, while the private diagnostic remains internal. Malformed protocol
data terminates the worker.

The parent admits requests to a bounded FIFO queue. Caller cancellation applies
while waiting and during execution. A worker is replaced after any execution
error, cancellation that reaches its exchange, protocol or transport failure,
or after ten successful responses. It does not run a health request between
successful executions. Shutdown stops admission, drains queued and active work
until the server shutdown context expires, then kills and reaps the remaining
workers.

## Native runtime

The Go module pins gomonty `v0.0.14`, which embeds glibc shared libraries for
Linux amd64 and arm64. That release builds against official Monty commit
`c9802b5f30d11fecf9f153feb1dfdab3abda070e`. The production image contains no
separate `monty` executable.

Run focused validation with:

```sh
cd go/cloud-query
go test -race ./internal/tools/python/... ./internal/service
```
