import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { HelmHealthChip } from 'components/cd/repos/HelmHealthChip'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  useHelmRepositoriesQuery,
  useHelmRepositoryQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useLayoutEffect } from 'react'

function RawChartForm({ chart, setChart, version, setVersion }) {
  return (
    <>
      <FormField
        required
        label="Chart Name"
      >
        <Input
          value={chart}
          onChange={(e) => setChart(e.target?.value)}
        />
      </FormField>
      <FormField
        required
        label="Chart Version"
      >
        <Input
          value={version}
          onChange={(e) => setVersion(e.target?.value)}
        />
      </FormField>
    </>
  )
}

export function ChartForm({ charts, chart, version, setChart, setVersion }) {
  const selectedChart = charts?.find((c) => c.name === chart)

  useLayoutEffect(() => {
    if (!isEmpty(charts)) {
      if (
        !charts.find((c) => {
          console.log('chart.name', c.name)
          console.log('chart', chart)

          return c.name === chart
        })
      ) {
        setVersion('')
        setChart('')
      } else if (!selectedChart?.versions?.find((v) => v.version === version)) {
        setVersion('')
      }
    }
  }, [
    chart,
    charts,
    charts.length,
    selectedChart?.versions,
    setChart,
    setVersion,
    version,
  ])

  if (isEmpty(charts)) {
    return (
      <RawChartForm
        chart={chart}
        setChart={setChart}
        version={version}
        setVersion={setVersion}
      />
    )
  }

  return (
    <>
      <FormField
        required
        label="Chart"
      >
        <Select
          label="Select chart"
          selectedKey={chart || ''}
          onSelectionChange={(key) => {
            setChart(key)
            if (key !== chart) {
              setVersion('')
            }
          }}
        >
          {(charts || []).map((chart) => (
            <ListBoxItem
              key={chart.name}
              label={chart.name}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        required
        label="Version"
      >
        <Select
          label={!chart ? 'Must select a chart first' : 'Select version'}
          selectedKey={version || ''}
          onSelectionChange={(key) => setVersion(key)}
          isDisabled={!chart}
        >
          {(selectedChart?.versions || []).map((vsn) => (
            <ListBoxItem
              key={vsn.version}
              label={`${vsn.version} (appVersion=${vsn.appVersion})`}
            />
          ))}
        </Select>
      </FormField>
    </>
  )
}

function EmptyState({ loading }) {
  if (loading) return <LoadingIndicator />

  return <>Looks like you need to register a helm repository first...</>
}

const keyToRepo = (key) => {
  const parts = (key || '').split(':')

  if (parts.length === 2) return { namespace: parts[0], name: parts[1] }

  return null
}

export default function DeployServiceSettingsHelm({
  repository,
  setRepository,
  chart,
  setChart,
  version,
  setVersion,
}) {
  const { data, loading } = useHelmRepositoriesQuery({
    fetchPolicy: 'cache-and-network',
  })

  const { data: charts } = useHelmRepositoryQuery({
    variables: {
      name: repository?.name || '',
      namespace: repository?.namespace || '',
    },
    skip: !repository?.name || !repository?.namespace,
  })

  if (!data?.helmRepositories) return <EmptyState loading={loading} />

  const repositories = data?.helmRepositories
  const selectedRepository = repositories.find(
    (r) =>
      r?.metadata.name === repository?.name &&
      r?.metadata.namespace === repository?.namespace
  )

  return (
    <>
      <FormField
        required
        label="Repository"
        hint="Select a chart repository to fetch your chart from"
      >
        <Select
          label="Select Repository"
          selectedKey={`${repository?.namespace}:${repository?.name}`}
          onSelectionChange={(key) => setRepository(keyToRepo(key))}
          leftContent={
            selectedRepository && (
              <HelmHealthChip
                ready={!!selectedRepository?.status?.ready}
                message={selectedRepository?.status?.message}
              />
            )
          }
        >
          {(repositories || []).map((repo) => (
            <ListBoxItem
              key={`${repo?.metadata.namespace}:${repo?.metadata.name}`}
              label={repo?.spec.url}
              leftContent={
                <HelmHealthChip
                  ready={!!repo?.status?.ready}
                  message={repo?.status?.message}
                />
              }
            />
          ))}
        </Select>
      </FormField>
      <ChartForm
        charts={charts?.helmRepository?.charts || []}
        chart={chart}
        setChart={setChart}
        version={version}
        setVersion={setVersion}
      />
    </>
  )
}
