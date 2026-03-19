# Metering

The proxy aggregates request-body bytes and periodically reports usage to Console
via gRPC `MeterMetrics`.

Behavior:

- Interval is controlled by `--meter-interval`.
- If `Content-Length` is present and positive, bytes are counted once from that value.
- If content length is unknown, bytes are counted from streamed body reads.
- Usage is aggregated across requests and flushed on interval.
- On flush failure, bytes are re-queued and retried on the next flush.
- On shutdown, a final flush is attempted.
