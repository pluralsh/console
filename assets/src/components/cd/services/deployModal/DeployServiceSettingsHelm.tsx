import {
  FormField,
  Input,
  ListBoxItem,
  Select,
  Spinner,
} from '@pluralsh/design-system'
import { HelmHealthChip } from 'components/cd/repos/HelmHealthChip'
import useOnUnMount from 'components/hooks/useOnUnMount'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { InlineLink } from 'components/utils/typography/InlineLink'
import {
  NamespacedName,
  useFluxHelmRepositoriesQuery,
  useFluxHelmRepositoryQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useLayoutEffect, useState } from 'react'

function ChartFormValuesRaw({ chart, setChart, version, setVersion }) {
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

function ChartFormValuesDropdown({
  chart,
  setChart,
  charts,
  version,
  setVersion,
  selectedChart,
  loading,
}) {
  return (
    <>
      <FormField
        required
        label="Chart"
      >
        <Select
          label="Select chart"
          isDisabled={loading}
          selectedKey={chart || ''}
          onSelectionChange={(key) => {
            setChart(key)
            if (key !== chart) {
              setVersion('')
            }
          }}
          rightContent={loading ? <Spinner /> : null}
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
          isDisabled={!chart || loading}
          rightContent={loading ? <Spinner /> : null}
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

export function ChartForm({
  charts,
  chart,
  version,
  setChart,
  setVersion,
  loading,
  dropdownEnabled,
}) {
  const selectedChart = charts?.find((c) => c.name === chart)

  useLayoutEffect(() => {
    if (!isEmpty(charts)) {
      if (!charts.find((c) => c.name === chart)) {
        setVersion('')
        setChart('')
      } else if (!selectedChart?.versions?.find((v) => v.version === version)) {
        setVersion('')
      }
    }
  }, [chart, charts, selectedChart?.versions, setChart, setVersion, version])

  if (dropdownEnabled && (loading || !isEmpty(charts))) {
    return (
      <ChartFormValuesDropdown
        chart={chart}
        charts={charts}
        setChart={setChart}
        selectedChart={selectedChart}
        version={version}
        setVersion={setVersion}
        loading={loading}
      />
    )
  }

  return (
    <ChartFormValuesRaw
      chart={chart}
      setChart={setChart}
      version={version}
      setVersion={setVersion}
    />
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
}: {
  repository: NamespacedName | null
  setRepository: (repository: NamespacedName | null) => void
  chart: string
  setChart: (chart: string) => void
  version: string
  setVersion: (version: string) => void
}) {
  const { data, loading } = useFluxHelmRepositoriesQuery({
    fetchPolicy: 'cache-and-network',
  })
  const [selectIsOpen, setSelectIsOpen] = useState(false)

  const useFluxHelmData = !!repository?.name && !!repository?.namespace
  const { data: charts, loading: loadingFluxHelmRepository } =
    useFluxHelmRepositoryQuery({
      variables: {
        name: repository?.name || '',
        namespace: repository?.namespace || '',
      },
      skip: !useFluxHelmData,
    })

  useOnUnMount(() => {
    if (!(repository && chart && version)) {
      setRepository(null)
      setChart('')
      setVersion('')
    }
  })

  if (!data?.fluxHelmRepositories) return <EmptyState loading={loading} />

  const repositories = data?.fluxHelmRepositories
  const selectedRepository = repositories.find(
    (r) =>
      r?.metadata.name === repository?.name &&
      r?.metadata.namespace === repository?.namespace
  )

  const selectedKey = repository
    ? `${repository?.namespace}:${repository?.name}`
    : ''

  return (
    <>
      <FormField
        label="Repository"
        hint="Select a chart repository to fetch your chart from"
        {...(repository
          ? {
              caption: (
                <InlineLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setRepository(null)
                  }}
                >
                  Deselect
                </InlineLink>
              ),
            }
          : {})}
      >
        <Select
          label="Select Repository"
          isOpen={selectIsOpen}
          onOpenChange={(open) => setSelectIsOpen(open)}
          selectedKey={selectedKey}
          onSelectionChange={(key) => {
            setRepository(keyToRepo(key))
            setSelectIsOpen(false)
          }}
          leftContent={
            selectedRepository && (
              <HelmHealthChip
                ready={!!selectedRepository?.status?.ready}
                message={selectedRepository?.status?.message}
              />
            )
          }
          dropdownHeader={
            selectedRepository ? <ListBoxItem label="None" /> : undefined
          }
          onHeaderClick={() => {
            setRepository(null)
            setSelectIsOpen(false)
          }}
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
      {selectedRepository && (
        <ChartForm
          charts={charts?.fluxHelmRepository?.charts || []}
          chart={chart}
          setChart={setChart}
          version={version}
          setVersion={setVersion}
          loading={loadingFluxHelmRepository}
          dropdownEnabled={useFluxHelmData}
        />
      )}
    </>
  )
}
