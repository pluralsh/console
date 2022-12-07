import { Button, FiltersIcon, ListBoxItem } from '@pluralsh/design-system'
import { LOG_FILTER_Q } from 'components/graphql/plural'
import { useCallback, useState } from 'react'
import { useQuery } from 'react-apollo'

import { LogsInfoPanel } from './LogsInfoPanel'

function selectedFilter(labels, search, spec) {
  if ((spec.query || '') !== search) return false

  for (const { name, value } of spec.labels) {
    if (labels[name] !== value) return false
  }

  return true
}

export default function LogsFilters({
  namespace, labels, search, setSearch, setLabels,
}) {
  const [open, setOpen] = useState<boolean>(false)
  const { data } = useQuery(LOG_FILTER_Q, { variables: { namespace } })

  const clear = useCallback(() => {
    setSearch('')
    setLabels({})
  }, [setSearch, setLabels])

  const select = useCallback(({ query, labels }) => {
    if (labels) setLabels(labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {}))
    setSearch(query || '')
  }, [setSearch, setLabels])

  if (!data?.logFilters) return null

  const { logFilters } = data

  if (logFilters.length < 1) return null

  return (
    <>
      <Button
        secondary
        startIcon={<FiltersIcon />}
        height={40}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        Filters
      </Button>
      {open && (
        <LogsInfoPanel
          title="Filters"
          subtitle="Select an attribute below to apply a filter."
          onClose={() => setOpen(false)}
        >
          {logFilters.map(({ metadata: { name }, spec }) => {
            const selected = selectedFilter(labels, search, spec)

            return (
              <ListBoxItem
                key={name}
                label={spec.name}
                description={spec.description}
                textValue={name}
                selected={selected}
                onClick={selected ? clear : () => select(spec)}
              />
            )
          })}
        </LogsInfoPanel>
      )}
    </>
  )
}
