import { Callout } from '@pluralsh/design-system'
import * as Sentry from '@sentry/react'
import { ErrorInfo, ReactNode, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useRouteError } from 'react-router-dom'
import { useTheme } from 'styled-components'

function logError(error: Error, info: ErrorInfo) {
  Sentry.captureException(error)
  console.error('Error:', error)
  console.error(`Component stack:\n${info.componentStack}`)
}

export function PluralErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={logError}
      FallbackComponent={ErrorFallback}
    >
      {children}
    </ErrorBoundary>
  )
}

export function PluralRouteErrorBoundary() {
  const { spacing } = useTheme()
  const error = useRouteError() as Error

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div css={{ padding: spacing.large }}>
      <ErrorFallback
        error={error}
        title="Something went wrong. Check logs for more details."
      />
    </div>
  )
}

function ErrorFallback({ error, title }: { error: Error; title?: string }) {
  return (
    <Callout
      severity="danger"
      title={title || 'Sorry, something went wrong'}
    >
      {error.message}
    </Callout>
  )
}
