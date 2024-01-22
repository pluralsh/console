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
      ? stringify(typeof v.raw === 'string' ? JSON.parse(v.raw) : v.raw)
      : ''
  }, [data])

  if (isEmpty(raw)) {
    return <EmptyState message="No data available." />
  }

  return (
    <Code
      language="yaml"
      maxHeight="100%"
      overflowY="auto"
    >
      {raw}
    </Code>
  )
}
