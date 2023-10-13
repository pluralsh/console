import { Code } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { stringify } from 'yaml'

export default function ComponentRaw() {
  const { data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )

  return (
    <Code
      language="yaml"
      maxHeight="100%"
      overflowY="auto"
    >
      {stringify(
        typeof value.raw === 'string' ? JSON.parse(value?.raw) : value?.raw
      )}
    </Code>
  )
}
