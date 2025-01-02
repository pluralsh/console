import { ReactElement, useCallback, useEffect, useState } from 'react'
import { GraphQLToast } from '@pluralsh/design-system'

import { hash } from '../../../utils/sha'

import type { Error } from './types'

interface ErrorToastProps {
  errors: Nullable<Array<Error>>
}

function ErrorToast({ errors }: ErrorToastProps): Nullable<ReactElement<any>> {
  const [queue, setQueue] = useState<Array<Error>>(errors?.slice(1) ?? [])
  const [error, setError] = useState<Nullable<Error>>(errors?.at(0))
  const [sha, setSHA] = useState<string>()
  const onClose = useCallback(() => {
    const error = [...queue].shift()

    setQueue(queue.slice(1))
    setError(error)
  }, [queue])

  useEffect(() => {
    calculateSHA(JSON.stringify(error))

    async function calculateSHA(current: string) {
      setSHA(await hash(current ?? ''))
    }
  }, [error])

  useEffect(() => {
    if (!errors) {
      return
    }

    setQueue(errors?.slice(1) ?? [])
    setError(errors?.at(0))
  }, [errors])

  return (
    error && (
      <GraphQLToast
        key={sha}
        error={{ graphQLErrors: [{ message: error.ErrStatus.message }] }}
        header={`${error.ErrStatus?.reason} (${error.ErrStatus?.code})`}
        margin="xlarge"
        marginVertical="xxxlarge"
        onClose={onClose}
      />
    )
  )
}

export { ErrorToast }
