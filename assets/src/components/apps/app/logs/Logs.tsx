import { Input, SearchIcon, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useCallback, useContext, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { toMap, useQueryParams } from 'components/utils/query'
import { Flex } from 'honorable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LogsLabels from './LogsLabels'
import LogsDownloader from './LogsDownloader'
import LogsFilters from './LogsFilters'
import { LogsCard } from './LogsCard'
import LogsFullScreen from './LogsFullScreen'

export default function Logs() {
  const { appName } = useParams()
  const query = useQueryParams()
  const { applications } = useContext<any>(InstallationContext)
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

  const currentApp = applications.find((app) => app.name === appName)
  const searchQuery = search.length > 0 ? ` |~ "${search}"` : ''
  const labelList = Object.entries(labels).map(([name, value]) => ({
    name,
    value,
  }))
  const labelQuery = useMemo(
    () =>
      [...labelList, { name: 'namespace', value: appName }]
        .map(({ name, value }) => `${name}="${value}"`)
        .join(','),
    [labelList, appName]
  )
  const logQuery = `{${labelQuery}}${searchQuery}`

  const breadcrumbs = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'logs', url: `/apps/${appName}/logs` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

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
            application={currentApp}
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
            repo={appName}
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
        />
        <LogsLabels
          labels={labelList}
          removeLabel={removeLabel}
        />
        <LogsCard
          application={currentApp}
          query={logQuery}
          addLabel={addLabel}
        />
      </Flex>
    </ScrollablePage>
  )
}
