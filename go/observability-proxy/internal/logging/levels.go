package logging

import "k8s.io/klog/v2"

// Shared klog verbosity levels for observability-proxy.
//
// Use these constants instead of raw numbers so logging intent is explicit
// and consistent across packages.
//
// Severity logs (klog.Warningf / klog.Errorf) are emitted regardless of
// verbosity and should be used for degradations and failures.
//
// Verbosity guidance:
//   - LevelMinimal: service lifecycle milestones and operator-facing state.
//   - LevelInfo: important transitions in normal operation.
//   - LevelVerbose: request-class flow summaries (can be frequent).
//   - LevelDebug: troubleshooting details and decision points.
//   - LevelTrace: per-request internals with potentially high volume.
//
// Runtime defaults:
//   - Production: -v=0 or -v=1
//   - Staging: -v=2
//   - Incident debugging: -v=4
//   - Deep tracing: -v=5 (short windows only)
const (
	// LevelMinimal is the baseline operational signal level (`-v=0`).
	LevelMinimal = klog.Level(0)
	// LevelInfo is for important but non-noisy informational events (`-v=1`).
	LevelInfo = klog.Level(1)
	// LevelVerbose is for frequent high-level request flow logs (`-v=2`).
	LevelVerbose = klog.Level(2)
	// LevelDebug is for troubleshooting details and branch decisions (`-v=4`).
	LevelDebug = klog.Level(4)
	// LevelTrace is for very detailed per-request internals (`-v=5`).
	LevelTrace = klog.Level(5)
)
