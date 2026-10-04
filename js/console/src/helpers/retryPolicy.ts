// 408 request timeout, 504 gateway timeout, 524 cloudflare origin timeout.
// The server is most likely still running the request (eg slow prometheus range
// queries behind a load balancer with a shorter idle timeout than ours), so each
// retry stacks another copy of the same expensive work; allow only a couple.
const TIMEOUT_STATUSES = new Set([408, 504, 524])
export const MAX_TIMEOUT_RETRIES = 2

export function isTimeoutError(error: unknown) {
  const status = (error as Nullable<{ statusCode?: unknown }>)?.statusCode
  return typeof status === 'number' && TIMEOUT_STATUSES.has(status)
}

/** `attempt` is RetryLink's 1-based count of attempts made so far. */
export function shouldRetryRequest(
  attempt: number,
  error: unknown,
  { authenticated, noRetry }: { authenticated: boolean; noRetry?: boolean }
) {
  if (!error || !authenticated || noRetry) return false
  return !isTimeoutError(error) || attempt <= MAX_TIMEOUT_RETRIES
}
