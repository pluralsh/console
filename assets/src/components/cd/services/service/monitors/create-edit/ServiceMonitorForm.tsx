import {
  Card,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  SearchIcon,
  Select,
} from '@pluralsh/design-system'
import { LogsLabelsPicker } from 'components/cd/logs/LogsFilters'
import { LogsLabels } from 'components/cd/logs/LogsLabels'
import { EditableDiv } from 'components/utils/EditableDiv'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { EditableDivWrapperSC } from 'components/workbenches/tools/WorkbenchToolFormFields'
import {
  MonitorAggregate,
  MonitorAttributes,
  MonitorOperator,
  useLogAggregationQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { ServiceMonitorStepKey } from './ServiceMonitorCreateOrEdit'

export const DURATION_OPTIONS = [
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '6h',
  '12h',
  '1d',
]
export const BUCKET_SIZE_OPTIONS = ['5m', '15m', '30m', '1h']

export function ServiceMonitorForm({
  state,
  update,
  curStep,
  isLoading,
}: {
  state: MonitorAttributes
  update: (update: Partial<MonitorAttributes>) => void
  curStep: ServiceMonitorStepKey
  isLoading: boolean
}) {
  const log = state.query.log
  const updateLog = (patch: Partial<typeof log>) =>
    update({ query: { ...state.query, log: { ...log, ...patch } } })

  const facets = (log.facets ?? []).filter(isNonNullable)
  const addFacet = (key: string, value: string) =>
    updateLog({ facets: [...facets, { key, value }] })
  const removeFacet = (key: string) =>
    updateLog({ facets: facets.filter((f) => f.key !== key) })

  const { data: logAggData } = useLogAggregationQuery({
    variables: { serviceId: state.serviceId, limit: 100 },
  })
  const logs = useMemo(
    () => logAggData?.logAggregation?.filter(isNonNullable) ?? [],
    [logAggData]
  )

  if (isLoading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height={220}
      />
    )
  return (
    <ContentCardSC>
      {curStep === 'description' && (
        <>
          <Flex gap="medium">
            <StretchedFormField
              required
              label="Monitor name"
            >
              <Input2
                placeholder="Enter monitor name"
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </StretchedFormField>
            <StretchedFormField label="Monitor description">
              <Input2
                placeholder="Enter monitor description"
                value={state.description ?? ''}
                onChange={(e) => update({ description: e.target.value })}
              />
            </StretchedFormField>
          </Flex>
          <StretchedFormField
            required
            label="Evaluation schedule"
            infoTooltip={
              <span>
                Cron expression defining how often this monitor is evaluated
                e.g.
                <br />
                -- <strong>*/5 * * * *</strong> -- for every 5 minutes or
                <br /> -- <strong>@daily</strong> -- for daily at midnight
              </span>
            }
          >
            <Input2
              placeholder="*/5 * * * * or @daily"
              value={state.evaluationCron}
              onChange={(e) => update({ evaluationCron: e.target.value })}
            />
          </StretchedFormField>
          <StretchedFormField
            label="Alert template"
            infoTooltip={
              <span>
                Optional custom message shown when this monitor fires.
                <br />
                {
                  'You can insert monitor details with values like {{ monitor.name }} or {{ monitor.service.name }}'
                }
              </span>
            }
            hint="Note: values must match actual fields on the monitor object"
          >
            <EditableDivWrapperSC
              css={{ minHeight: 92, maxHeight: 180, overflow: 'auto' }}
            >
              <EditableDiv
                placeholder="e.g. Monitor {{ monitor.name }} is firing for {{ monitor.service.name }}"
                initialValue={state.alertTemplate ?? ''}
                setValue={(value) => update({ alertTemplate: value })}
              />
            </EditableDivWrapperSC>
          </StretchedFormField>
        </>
      )}
      {curStep === 'threshold-config' && (
        <Flex gap="medium">
          <StretchedFormField
            required
            label="Threshold value"
          >
            <Input2
              placeholder="Enter numeric value"
              value={state.threshold.value}
              error={isNaN(state.threshold.value)}
              onChange={(e) => {
                const val = Number(e.target.value)
                update({
                  threshold: {
                    ...state.threshold,
                    value: isNaN(val) ? 0 : val,
                  },
                })
              }}
            />
          </StretchedFormField>
          <StretchedFormField
            required
            label="Aggregate"
          >
            <Select
              selectedKey={state.threshold.aggregate}
              onSelectionChange={(key) =>
                update({
                  threshold: {
                    ...state.threshold,
                    aggregate: key as MonitorAggregate,
                  },
                })
              }
            >
              {Object.values(MonitorAggregate).map((aggregate) => (
                <ListBoxItem
                  key={aggregate}
                  label={aggregate}
                />
              ))}
            </Select>
          </StretchedFormField>
        </Flex>
      )}
      {curStep === 'log-query' && (
        <>
          <Flex gap="medium">
            <StretchedFormField
              required
              label="Lookback duration"
              infoTooltip="How far back in time to search for log entries when evaluating this monitor"
            >
              <Select
                selectedKey={log.duration ?? ''}
                onSelectionChange={(key) =>
                  updateLog({ duration: key as string })
                }
              >
                {DURATION_OPTIONS.map((opt) => (
                  <ListBoxItem
                    key={opt}
                    label={opt}
                  />
                ))}
              </Select>
            </StretchedFormField>
            <StretchedFormField
              required
              label="Bucket size"
              infoTooltip="Time interval used to group log results into buckets when aggregating"
            >
              <Select
                selectedKey={log.bucketSize}
                onSelectionChange={(key) =>
                  updateLog({ bucketSize: key as string })
                }
              >
                {BUCKET_SIZE_OPTIONS.map((opt) => (
                  <ListBoxItem
                    key={opt}
                    label={opt}
                  />
                ))}
              </Select>
            </StretchedFormField>
            <StretchedFormField label="Operator">
              <Select
                selectedKey={log.operator ?? ''}
                onSelectionChange={(key) =>
                  updateLog({ operator: key as MonitorOperator })
                }
              >
                {Object.values(MonitorOperator).map((op) => (
                  <ListBoxItem
                    key={op}
                    label={op}
                  />
                ))}
              </Select>
            </StretchedFormField>
          </Flex>
          <Flex gap="medium">
            <Input2
              startIcon={<SearchIcon />}
              placeholder="Enter query to search on logs (required)"
              value={log.query}
              onChange={(e) => updateLog({ query: e.target.value })}
              css={{ flex: 1 }}
            />
            <LogsLabelsPicker
              logs={logs}
              serviceId={state.serviceId}
              addLabel={addFacet}
              selectedLabels={facets}
              flex={1}
            />
          </Flex>
          <LogsLabels
            labels={facets}
            removeLabel={removeFacet}
          />
        </>
      )}
    </ContentCardSC>
  )
}

const ContentCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.xlarge,
}))

const StretchedFormField = styled(FormField)({
  flex: 1,
})
