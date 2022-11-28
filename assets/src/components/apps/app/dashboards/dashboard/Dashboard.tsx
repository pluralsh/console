import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Card,
  ListBoxItem,
  LoopingLogo,
  PageTitle,
  Select,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import {
  Key,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from 'react-apollo'
import { DASHBOARDS_Q, DASHBOARD_Q } from 'components/graphql/dashboards'
import { Div, Flex, Span } from 'honorable'

import { Graph } from 'components/utils/Graph'

import { filesize } from 'filesize'

import { DashboardSelectButton } from './DashboardSelectButton'

const HOUR = 60 * 60
const DAY = 24 * HOUR

export const DURATIONS = [
  {
    offset: HOUR, step: '2m', label: '1H', tick: 'every 10 minutes',
  },
  {
    offset: 2 * HOUR, step: '4m', label: '2H', tick: 'every 20 minutes',
  },
  {
    offset: 6 * HOUR, step: '10m', label: '6H', tick: 'every 30 minutes',
  },
  {
    offset: DAY, step: '20m', label: '1D', tick: 'every 2 hours',
  },
  {
    offset: 7 * DAY, step: '1h', label: '7D', tick: 'every 12 hours',
  },
]

export function format(value: any, format: any) {
  switch (format) {
  case 'bytes':
    return filesize(value || 0)
  case 'percent':
    return `${Math.round(value * 10000) / 100}%`
  default:
    return value
  }
}

export function RangePicker({ duration, setDuration }: any) {
  const tabStateRef = useRef<any>()
  const [selectedKey, setSelectedKey] = useState<Key>(`${duration.offset}+${duration.step}`)

  useEffect(() => {
    const dur = DURATIONS.find(d => selectedKey === `${d.offset}+${d.step}`)

    if (dur) setDuration(dur)
  }, [selectedKey, setDuration])

  return (
    <TabList
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey,
        onSelectionChange: setSelectedKey,
      }}
    >
      {DURATIONS.map(d => (
        <SubTab
          key={`${d.offset}+${d.step}`}
          textValue={d.label}
        >
          {d.label}
        </SubTab>
      ))}
    </TabList>
  )
}

function DashboardGraph({ graph, tick }) {
  const data = useMemo(() => (
    graph.queries.map(({ legend, results }) => (
      { id: legend, data: results.map(({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: parseFloat(value) })) }
    ))
  ), [graph])

  return (
    <Div
      className="dashboard"
      padding="large"
      height={360}
      width="100%"
    >
      <Div
        color="text-light"
        justifyContent="center"
        overline
        textAlign="center"
      >
        {graph.name}
      </Div>
      <Graph
        data={data}
        yFormat={v => format(v, graph.format)}
          // @ts-ignore
        tick={tick}
        tickRotation={45}
      />
    </Div>
  )
}

function LabelSelect({ label, onSelect }) {
  const [selectedKey, setSelectedKey] = useState<Key>(label.values[0])

  // Run it only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onSelect(label.values[0]), [])

  return (
    <Div width={250}>
      <Select
        aria-label={label.name}
        leftContent={(
          <Span
            caption
            color="text-xlight"
          >
            {label.name}
          </Span>
        )}
        selectedKey={selectedKey}
        onSelectionChange={value => {
          setSelectedKey(value)
          onSelect(value)
        }}
        width={250}
      >
        {label.values.map(value => (
          <ListBoxItem
            key={value}
            label={value}
            textValue={value}
          />
        ))}
      </Select>
    </Div>
  )
}

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
