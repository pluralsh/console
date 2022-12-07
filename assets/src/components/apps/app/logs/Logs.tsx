import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Input, PageTitle, SearchIcon } from '@pluralsh/design-system'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { toMap, useQueryParams } from 'components/utils/query'
import { Flex } from 'honorable'

import LogsLabels from './LogsLabels'
import LogsDownloader from './LogsDownloader'
import LogsFilters from './LogsFilters'
import { LogsCard } from './LogsCard'
import LogsFullScreen from './LogsFullScreen'

export default function Logs() {
  const { appName } = useParams()
  const query = useQueryParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const [search, setSearch] = useState('')
  const [labels, setLabels] = useState(toMap(query))

  const addLabel = useCallback((name, value) => setLabels({ ...labels, [name]: value }), [labels, setLabels])
  const removeLabel = useCallback(name => {
    const { [name]: _val, ...rest } = labels

    setLabels(rest)
  }, [labels, setLabels])

  const currentApp = applications.find(app => app.name === appName)
  const searchQuery = search.length > 0 ? ` |~ "${search}"` : ''
  const labelList = Object.entries(labels).map(([name, value]) => ({ name, value }))
  const labelQuery = useMemo(() => (
    [...labelList, { name: 'namespace', value: appName }].map(({ name, value }) => `${name}="${value}"`).join(',')
  ), [labelList, appName])
  const logQuery = `{${labelQuery}}${searchQuery}`

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Logs', url: `/apps/${appName}/logs` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Logs">
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
            labels={labelList}
            setLabels={setLabels}
            addLabel={addLabel}
            removeLabel={removeLabel}
          />
          <LogsDownloader
            query={logQuery}
            repo={appName}
          />
          <LogsFilters
            namespace={appName}
            setSearch={setSearch}
            setLabels={setLabels}
            labels={labels}
            search={search}
          />
        </Flex>
      </PageTitle>
      <Input
        marginBottom={labelList?.length > 0 ? '' : 'medium'}
        placeholder="Filter logs"
        startIcon={(<SearchIcon size={14} />)}
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
    </>
  )
}
