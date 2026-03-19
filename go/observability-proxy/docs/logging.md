# Logging Policy

`observability-proxy` uses `klog/v2` verbosity via the standard `-v` flag.
Severity logs (`Errorf`, `Warningf`) are always emitted regardless of `-v`.

## Level map

- `minimal` => `-v=0`
- `info` => `-v=1`
- `verbose` => `-v=2`
- `debug` => `-v=4`
- `trace` => `-v=5`

## When to use each level

- `minimal` (`-v=0`)
  - Service lifecycle and operator-facing milestones.
  - Examples: startup, listen address, shutdown signal.
  - Should stay low-cardinality and stable.

- `info` (`-v=1`)
  - Important state transitions that are useful in normal operations.
  - Examples: route registration, successful initial config load.
  - Good default for non-noisy production visibility.

- `verbose` (`-v=2`)
  - High-level request flow events without full internals.
  - Examples: request class handled (`ingest`, `query`), method/path summary.
  - Useful in staging and incident triage.

- `debug` (`-v=4`)
  - Detailed troubleshooting signals and branch decisions.
  - Examples: forwarding destination, config fallback behavior, metering flush result.
  - Intended for temporary use during debugging.

- `trace` (`-v=5`)
  - Very high-volume, per-request internals.
  - Examples: rewritten outbound URL, detailed per-request metadata.
  - Use only briefly due to volume and potential sensitivity.

## Error and warning guidance

- `klog.Errorf`
  - Use for failures that impact request handling or service correctness.
  - Examples: upstream proxy errors, startup/shutdown failures.

- `klog.Warningf`
  - Use for degraded but recoverable states.
  - Examples: initial config load failed but service can recover later.

## Event classification checklist

Before adding a log, classify it with these questions:

1. Is this required for operators even at default verbosity?
2. Is this expected per request and potentially noisy?
3. Does this include sensitive headers, tokens, or payloads?
4. Is this useful for debugging only?

If answers are `1=yes`, use `minimal` or `info`.
If `2=yes`, prefer `verbose`/`debug`/`trace`.
If `3=yes`, redact or do not log.
If `4=yes`, prefer `debug` or `trace`.

## What not to log

- Authentication tokens, passwords, API keys, or raw credentials.
- Full request/response bodies for ingest endpoints.
- High-cardinality identifiers at `minimal`/`info`.

## Recommended runtime defaults

- Production: `-v=0` or `-v=1`
- Staging: `-v=2`
- Incident debugging: `-v=4` (short window)
- Deep protocol tracing: `-v=5` (very short window)
