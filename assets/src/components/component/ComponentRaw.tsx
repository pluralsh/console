import { Code, EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { stringify } from 'yaml'
import isEmpty from 'lodash/isEmpty'

export default function ComponentRaw() {
  const { data } = useOutletContext<any>()
  const raw = useMemo(() => {
    const v: any = data
      ? Object.values(data).find((value) => value !== undefined)
      : null

    return v?.raw
  }, [data])

  return <RawYaml raw={raw} />
}

export function RawYaml({ raw }: { raw?: object | string | null | undefined }) {
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
    >
      {rawStr}
    </Code>
  )
}

export function RawJson({ raw }: { raw?: object | string | null | undefined }) {
  const rawStr = useMemo(() => {
    let json = ''

    try {
      json = raw
        ? JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2)
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
