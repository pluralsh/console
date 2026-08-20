# Sandboxed Python runner

This package implements `RunPython` with Monty's limited Python subset. It is
not CPython. The parent starts four copies of `cloud-query python-worker` and
communicates with them over private stdin/stdout pipes. Each worker loads
gomonty's embedded native library and creates a fresh REPL for every request.

## Execution contract

Each run receives Python source and an optional JSON object. The object becomes
the global `input` dictionary. `output` starts as an empty dictionary and must
remain JSON serializable and object shaped. The response returns `output` and
the user script's standard output separately.

Workers receive only `TMPDIR=/tmp`. The host supplies no filesystem,
environment, network, subprocess, shell, package, OS callback, external
function, or name-lookup capability.

Limits:

- Source: 64 KiB
- Input and result JSON: 1 MiB each
- Captured stdout: 64 KiB
- Monty execution: 10 seconds
- Parent wall clock: 15 seconds or the caller's earlier deadline
- Monty-managed memory: 64 MiB
- Recursion: 200 frames
- Active workers: four
- Waiting requests: 16 by default
- Worker recycling: 10 successful requests

Monty's memory limit does not bound total worker or pod RSS. The parent provides
the hard crash and wall-time limit by killing and replacing a worker process.

## Private protocol

Protocol version 1 uses a four-byte big-endian length followed by strict JSON.
Frames are bounded before allocation, unknown fields and trailing JSON values
are rejected, and only `health` and `run` request types are accepted. Every
response must repeat the request ID and type. Malformed protocol data terminates
the worker.

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
go test ./internal/tools/python ./internal/service
```
