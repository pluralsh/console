import { Code, EmptyState } from '@pluralsh/design-system'
import { ComponentPropsWithRef, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { stringify } from 'yaml'
import isEmpty from 'lodash/isEmpty'
import { ComponentDetailsContext } from './ComponentDetails'

export default function ComponentRaw() {
  const { componentDetails } = useOutletContext<ComponentDetailsContext>()

  return <RawYaml raw={componentDetails?.raw} />
}

export function RawYaml({
  raw,
  ...props
}: { raw?: Nullable<object | string> } & ComponentPropsWithRef<typeof Code>) {
  const rawStr = useMemo(
    () =>
      raw ? stringify(typeof raw === 'string' ? JSON.parse(raw) : raw) : '',
    [raw]
  )

  if (isEmpty(raw)) {
    return <EmptyState message="No data available." />
  }

  return (
    <Code
      language="yaml"
      maxHeight="100%"
      overflowY="auto"
      {...props}
    >
      {rawStr}
    </Code>
  )
}

export function RawJson({ raw }: { raw?: object | string | null | undefined }) {
  const rawStr = useMemo(() => {
    let json: string

    try {
      json = raw
        ? JSON.stringify(
            typeof raw === 'string' ? JSON.parse(raw) : raw,
            null,
            2
          )
        : ''
    } catch {
      json = typeof raw === 'string' ? raw : ''
    }

    return json
  }, [raw])

  if (isEmpty(raw)) {
    return <EmptyState message="No data available." />
  }

  return (
    <Code
      language="json"
      maxHeight="100%"
      overflowY="auto"
    >
      {rawStr}
    </Code>
  )
}
