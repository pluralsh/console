// mostly taken from https://docs.sentry.io/platforms/javascript/guides/react/
import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'

let sentryInitialized = false

export function initializeSentry(enabled: boolean = false) {
  if (
    sentryInitialized ||
    !enabled ||
    !import.meta.env.VITE_SENTRY_DSN ||
    import.meta.env.MODE === 'development'
  )
    return

  sentryInitialized = true

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration(),
    ],

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,

    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
    tracePropagationTargets: [
      /^\//, // same-origin requests
      /^\/gql/, // GraphQL
      /^\/api\/v1\//, // k8s REST proxy
    ],

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    initialScope: { tags: { 'plrl.flow': 'console' } },
  })
}
