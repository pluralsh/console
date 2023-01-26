import { Code, PageTitle } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'

import { stringify } from 'yaml'

export default function ComponentRaw() {
  const { data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = Object.values(data).find(value => value !== undefined)

  return (
    <>
      <PageTitle heading="Raw" />
      <Code
        language="yaml"
        maxHeight="calc(100vh - 244px)"
      >
        {stringify(JSON.parse(value?.raw))}
      </Code>
    </>
  )
}
