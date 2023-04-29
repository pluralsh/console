import { Input, SearchIcon, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toMap, useQueryParams } from 'components/utils/query'
import { Flex } from 'honorable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LogsLabels from './LogsLabels'
import LogsDownloader from './LogsDownloader'
import LogsFilters from './LogsFilters'
import { LogsCard } from './LogsCard'
import LogsFullScreen from './LogsFullScreen'

export default function AppLogs() {
  const { appName } = useParams()

  const breadcrumbs = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'logs', url: `/apps/${appName}/logs` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (!appName) {
    return null
  }

  return <LogsBase namespace={appName} />
}

export function LogsBase({ namespace }: { namespace: string }) {
  const query = useQueryParams()
  const [search, setSearch] = useState('')
  const [labels, setLabels] = useState(toMap(query))

  const addLabel = useCallback(
    (name, value) => setLabels({ ...labels, [name]: value }),
    [labels, setLabels]
  )
  const removeLabel = useCallback(
    (name) => {
      const { [name]: _val, ...rest } = labels

      setLabels(rest)
    },
    [labels, setLabels]
  )

  const searchQuery = search.length > 0 ? ` |~ "${search}"` : ''
  const labelList = Object.entries(labels).map(([name, value]) => ({
    name,
    value,
  }))
  const labelQuery = useMemo(
    () =>
      [...labelList, { name: 'namespace', value: namespace }]
        .map(({ name, value }) => `${name}="${value}"`)
        .join(','),
    [labelList, namespace]
  )
  const logQuery = `{${labelQuery}}${searchQuery}`

  return (
    <ScrollablePage
      heading="Logs"
      scrollable={false}
      headingContent={
        <Flex
          justify="end"
          gap="medium"
          grow={1}
        >
          <LogsFullScreen
            namespace={namespace}
            query={logQuery}
            search={search}
            setSearch={setSearch}
            labelList={labelList}
            labels={labels}
            setLabels={setLabels}
            addLabel={addLabel}
            removeLabel={removeLabel}
          />
          <LogsDownloader
            query={logQuery}
            repo={namespace}
          />
          <LogsFilters
            search={search}
            setSearch={setSearch}
            labels={labels}
            setLabels={setLabels}
          />
        </Flex>
      }
    >
      <Flex
        height="100%"
        flexDirection="column"
      >
        <Input
          marginBottom={labelList?.length > 0 ? '' : 'medium'}
          placeholder="Filter logs"
          startIcon={<SearchIcon size={14} />}
          value={search}
          onChange={({ target: { value } }) => setSearch(value)}
          flexShrink={0}
        />
        <LogsLabels
          labels={labelList}
          removeLabel={removeLabel}
        />
        <LogsCard
          namespace={namespace}
          query={logQuery}
          addLabel={addLabel}
        />
      </Flex>
    </ScrollablePage>
  )
}
