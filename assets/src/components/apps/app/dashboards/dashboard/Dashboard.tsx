import {
  Breadcrumb,
  Card,
  ListBoxItem,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Key, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { DASHBOARDS_Q, DASHBOARD_Q } from 'components/graphql/dashboards'
import { Flex } from 'honorable'

import { DURATIONS } from 'utils/time'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import RangePicker from '../../../../utils/RangePicker'

import { PageTitleSelectButton } from '../../../../utils/PageTitleSelectButton'

import LabelSelect from './DashboardLabelSelect'
import DashboardGraph from './DashboardGraph'

export default function Dashboard() {
  const navigate = useNavigate()
  const { appName, dashboardId: id } = useParams()
  const { setDashboard } = useOutletContext<any>()
  const [selectedKey, setSelectedKey] = useState<Key>('')
  const [duration, setDuration] = useState(DURATIONS[0])
  const [labelMap, setLabelMap] = useState({})
  const labels = useMemo(
    () =>
      Object.entries(labelMap || {}).map(([name, value]) => ({ name, value })),
    [labelMap]
  )
  const { data } = useQuery(DASHBOARD_Q, {
    variables: {
      repo: appName,
      name: id,
      labels,
      step: duration.step,
      offset: duration.offset,
    },
    pollInterval: 1000 * 30,
    fetchPolicy: 'no-cache',
  })

  const { data: dashboardsData } = useQuery(DASHBOARDS_Q, {
    variables: { repo: appName },
    fetchPolicy: 'cache-and-network',
  })

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'dashboards', url: `/apps/${appName}/dashboards` },
      {
        label: data?.dashboard?.spec?.name ?? '',
        url: `/apps/${appName}/dashboards/${data?.dashboard?.id}`,
      },
    ],
    [appName, data?.dashboard]
  )

  useSetBreadcrumbs(breadcrumbs)

  useEffect(() => setSelectedKey(data?.dashboard?.spec?.name || ''), [data])

  useEffect(() => {
    if (!labelMap && data && data.dashboard) {
      const map = data.dashboard.spec.labels.reduce(
        (acc, { name, values }) => ({ ...acc, [name]: values[0] }),
        {}
      )

      setLabelMap(map)
    }
  }, [data, labelMap, setLabelMap])
  const setLabel = useCallback(
    (label, value) => setLabelMap({ ...labelMap, [label]: value }),
    [labelMap, setLabelMap]
  )

  if (!data || !dashboardsData) return <LoadingIndicator />

  const { dashboard } = data
  const { dashboards } = dashboardsData

  setDashboard(dashboard)
  const filteredLabels = dashboard.spec.labels.filter(
    ({ values }) => values.length > 0
  )

  return (
    <ScrollablePage
      heading={
        <div>
          {/* @ts-ignore */}
          <Select
            aria-label="dashboards"
            selectedKey={selectedKey}
            onSelectionChange={(id) =>
              navigate(`/apps/${appName}/dashboards/${id}`)
            }
            triggerButton={
              <PageTitleSelectButton
                title="Dashboards"
                label={selectedKey}
              />
            }
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
        </div>
      }
    >
      <Flex
        direction="row"
        gap="medium"
        wrap="wrap"
      >
        {filteredLabels.map((label) => (
          <LabelSelect
            key={`${label.name}:${id}:${appName}`}
            label={label}
            onSelect={(value) => setLabel(label.name, value)}
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
          {dashboard.spec.graphs.map((graph) => (
            <DashboardGraph
              key={graph.name}
              graph={graph}
              tick={duration.tick}
            />
          ))}
        </Flex>
      </Card>
    </ScrollablePage>
  )
}
