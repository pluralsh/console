import { ApolloError } from '@apollo/client'
import { DevboxThreadFragment } from 'generated/graphql'

export type DevboxErrorCode =
  | 'UNSUPPORTED'
  | 'CLUSTER_OFFLINE'
  | 'INSTANCE_STARTING'

export function devboxErrorCode(
  error: Nullable<ApolloError | Error>
): Nullable<DevboxErrorCode | string> {
  if (!error || !('graphQLErrors' in error)) return null
  for (const e of error.graphQLErrors ?? []) {
    const code = e.extensions?.code
    if (typeof code === 'string') return code
  }
  return null
}

export const isUnsupportedError = (error: Nullable<ApolloError | Error>) =>
  devboxErrorCode(error) === 'UNSUPPORTED'

export const isClusterOfflineError = (error: Nullable<ApolloError | Error>) =>
  devboxErrorCode(error) === 'CLUSTER_OFFLINE'

export type DevboxThreadErrorAction = 'switchToProxy' | 'relink'

export type DevboxThreadErrorInfo = {
  title: string
  message?: string
  actions: DevboxThreadErrorAction[]
}

// the daemon maps plan-limit and auth failures to typed thread errors
// (`reason` is the devbox.v1 ErrorReason name)
export function describeThreadError(
  thread: Pick<DevboxThreadFragment, 'error' | 'billing' | 'agent'>
): Nullable<DevboxThreadErrorInfo> {
  const error = thread.error
  if (!error) return null
  const reason = `${error.reason ?? ''}`.toUpperCase()
  const message = (error.message as string) ?? undefined
  const onPlan = `${thread.billing ?? ''}`
    .toLowerCase()
    .startsWith('subscription')
  const plan = thread.agent === 'CODEX' ? 'ChatGPT plan' : 'Claude plan'

  if (reason.includes('PLAN_LIMIT_REACHED'))
    return {
      title: `${plan} limit reached`,
      message:
        message ??
        'Wait for the plan window to reset, or switch this agent to the Plural AI proxy.',
      actions: ['switchToProxy'],
    }
  if (reason.includes('AGENT_AUTH_FAILED'))
    return {
      title: onPlan
        ? `${plan} credential expired or revoked`
        : 'Agent authentication failed',
      message:
        message ??
        (thread.agent === 'CODEX'
          ? 'Relink a dedicated ChatGPT login, or switch to the Plural AI proxy meanwhile.'
          : 'Run `claude setup-token` and relink, or switch to the Plural AI proxy meanwhile.'),
      actions: onPlan ? ['switchToProxy', 'relink'] : [],
    }
  if (reason.includes('CREDENTIALS_UNAVAILABLE'))
    return {
      title: 'Credentials unavailable',
      message:
        message ?? "Console couldn't refresh this instance's credentials.",
      actions: [],
    }
  return { title: 'The agent reported an error', message, actions: [] }
}
