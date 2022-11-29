import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Card,
  ListBoxItem,
  LoopingLogo,
  PageTitle,
  Select,
} from '@pluralsh/design-system'
import {
  Key,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { DASHBOARDS_Q, DASHBOARD_Q } from 'components/graphql/dashboards'
import { Div, Flex } from 'honorable'

import { DURATIONS } from 'utils/time'

import RangePicker from '../../../../utils/RangePicker'

import { DashboardSelectButton } from './DashboardSelectButton'
import LabelSelect from './DashboardLabelSelect'
import DashboardGraph from './DashboardGraph'

export default function Dashboard() {
  const navigate = useNavigate()
  const { appName, dashboardId: id } = useParams()
  const { setDashboardDescription }: any = useOutletContext()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const [selectedKey, setSelectedKey] = useState<Key>('')
  const [duration, setDuration] = useState(DURATIONS[0])
  const [labelMap, setLabelMap] = useState({})
  const labels = useMemo(() => Object.entries(labelMap || {}).map(([name, value]) => ({ name, value })), [labelMap])
  const { data } = useQuery(DASHBOARD_Q, {
    variables: {
      repo: appName, name: id, labels, step: duration.step, offset: duration.offset,
    },
    pollInterval: 1000 * 30,
    fetchPolicy: 'no-cache',
  })

  const { data: dashboardsData } = useQuery(DASHBOARDS_Q, {
    variables: { repo: appName },
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Dashboards', url: `/apps/${appName}/dashboards` },
    { text: id, url: `/apps/${appName}/dashboards/${id}` },
  ]), [appName, id, setBreadcrumbs])

  useEffect(() => setSelectedKey(data?.dashboard?.spec?.name || ''), [data])

  useEffect(() => {
    if (!labelMap && data && data.dashboard) {
      const map = data.dashboard.spec.labels.reduce((acc, { name, values }) => ({ ...acc, [name]: values[0] }), {})

      setLabelMap(map)
    }
  }, [data, labelMap, setLabelMap])
  const setLabel = useCallback((label, value) => setLabelMap({ ...labelMap, [label]: value }), [labelMap, setLabelMap])

  if (!data || !dashboardsData) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const { dashboard } = data
  const { dashboards } = dashboardsData

  setDashboardDescription(dashboard.spec?.description)
  const filteredLabels = dashboard.spec.labels.filter(({ values }) => values.length > 0)

  return (
    <Div>
      <PageTitle heading={(
        <Div>
          <Select
            aria-label="dashboards"
            selectedKey={selectedKey}
            onSelectionChange={id => navigate(`/apps/${appName}/dashboards/${id}`)}
            triggerButton={<DashboardSelectButton label={selectedKey} />}
            width={240}
          >
            {dashboards.map(({ id, spec: { name } }) => (
              <ListBoxItem
                key={id}
                label={name}
                textValue={id}
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
        {filteredLabels.map(label => (
          <LabelSelect
            key={`${label.name}:${id}:${appName}`}
            label={label}
            onSelect={value => setLabel(label.name, value)}
          />
        ))}
        <Flex grow={1} />
        <RangePicker
          duration={duration}
          setDuration={setDuration}
        />
      </Flex>
      <Card marginVertical="large">
        <Flex wrap="wrap">
          {dashboard.spec.graphs.map(graph => (
            <DashboardGraph
              key={graph.name}
              graph={graph}
              tick={duration.tick}
            />
          ))}
        </Flex>
      </Card>
    </Div>
  )
}
