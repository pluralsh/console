import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Button,
  Card,
  ListBoxItem,
  LoopingLogo,
  PageTitle,
  Select,
} from '@pluralsh/design-system'
import {
  Key,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { Div, Flex } from 'honorable'

import { DURATIONS, SECOND_TO_MILLISECONDS } from 'utils/time'

import { RUNBOOKS_Q, RUNBOOK_Q } from 'components/runbooks/queries'

import RangePicker from '../../../../utils/RangePicker'
import { PageTitleSelectButton } from '../../../../utils/PageTitleSelectButton'

// import { DashboardSelectButton } from './DashboardSelectButton'

export default function Runbook() {
  const navigate = useNavigate()
  const { appName, runbookName } = useParams()
  const [duration, setDuration] = useState(DURATIONS[0])
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  const {
    data, // , loading, fetchMore, refetch,
  } = useQuery(RUNBOOK_Q, {
    variables: {
      namespace: appName,
      name: runbookName,
      context: { timeseriesStart: -duration.offset, timeseriesStep: duration.step },
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: SECOND_TO_MILLISECONDS * 30,
  })

  const { data: runbooksData } = useQuery(RUNBOOKS_Q, {
    variables: { namespace: appName },
    fetchPolicy: 'cache-and-network',
    pollInterval: SECOND_TO_MILLISECONDS * 30,
  })

  const [selectedKey, setSelectedKey] = useState<Key>('')

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Runbooks', url: `/apps/${appName}/runbooks` },
    { text: data?.runbook?.spec?.name, url: `/apps/${appName}/runbooks/${data?.runbook?.name}` },
  ]), [appName, data, setBreadcrumbs])

  useEffect(() => setSelectedKey(data?.runbook?.spec?.name || ''), [data])

  if (!data || !runbooksData) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  // const { runbook } = data
  const { runbooks } = runbooksData

  return (
    <Div>
      <PageTitle heading={(
        <Div>
          <Select
            aria-label="dashboards"
            selectedKey={selectedKey}
            onSelectionChange={name => navigate(`/apps/${appName}/runbooks/${name}`)}
            triggerButton={(
              <PageTitleSelectButton
                title="Runbooks"
                label={selectedKey}
              />
            )}
            width={240}
          >
            {runbooks.map(runbook => (
              <ListBoxItem
                key={runbook.name}
                label={runbook.spec.name}
                textValue={runbook.name}
              />
            ))}
          </Select>
        </Div>
      )}
      />
      <Flex
        direction="row"
        gap="medium"
        wrap="wrap"
      >
        <RangePicker
          duration={duration}
          setDuration={setDuration}
        />
        <Flex grow={1} />
        <Button
          primary
          fontWeight={600}
        >
          Scale
        </Button>
      </Flex>
      <Card marginVertical="large">
        <Flex wrap="wrap">
          {/* {dashboard.spec.graphs.map(graph => (
            <DashboardGraph
              key={graph.name}
              graph={graph}
              tick={duration.tick}
            />
          ))} */}
          graph
        </Flex>
      </Card>
    </Div>
  )
}
