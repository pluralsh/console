import {
  Button,
  Card,
  EmptyState,
  Flex,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  getMonitorFormStepIcon,
  isMonitorFormValid,
  sanitizeInitialFormState,
  type ServiceMonitorAttributes,
  type ServiceMonitorStepKey,
} from 'components/cd/services/service/monitors/create-edit/ServiceMonitorCreateOrEdit'
import { ServiceMonitorForm } from 'components/cd/services/service/monitors/create-edit/ServiceMonitorForm'
import { ServiceMonitorPreview } from 'components/cd/services/service/monitors/create-edit/ServiceMonitorPreview'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  Body2BoldP,
  OverlineH3,
  Title2H1,
} from 'components/utils/typography/Text'
import {
  MonitorType,
  useDeleteMonitorMutation,
  useUpdateWorkbenchMonitorMutation,
  useWorkbenchMonitorQuery,
  useWorkbenchQuery,
  WorkbenchMonitorDetailsFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchMonitoringAbsPath,
  getWorkbenchMonitoringMonitorAbsPath,
  WORKBENCH_MONITORING_MONITOR_PARAM_ID,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { SidebarBtnSC } from '../create-edit/WorkbenchCreateOrEdit'

const STEPS: { key: ServiceMonitorStepKey; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'threshold-config', label: 'Threshold config' },
  { key: 'log-query', label: 'Log query' },
]

export function WorkbenchMonitorSettings() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const monitorId = useParams()[WORKBENCH_MONITORING_MONITOR_PARAM_ID] ?? ''

  const { data: workbenchData } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const { data, loading, error } = useWorkbenchMonitorQuery({
    variables: { id: monitorId },
    skip: !monitorId,
    fetchPolicy: 'network-only',
  })
  const monitor = data?.monitor

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        { label: 'monitor settings' },
      ],
      [workbench]
    )
  )

  if (error) return <GqlError error={error} />
  if (!monitor && loading)
    return (
      <PageSC>
        <RectangleSkeleton
          $width="100%"
          $height={400}
        />
      </PageSC>
    )
  if (!monitor)
    return (
      <PageSC>
        <EmptyState message="Monitor not found." />
      </PageSC>
    )

  if (monitor.type !== MonitorType.Log)
    return (
      <PageSC>
        <Title2H1 css={{ marginBottom: 16 }}>{monitor.name}</Title2H1>
        <EmptyState message="Manual settings are only available for log monitors. Use Update via prompt to edit metrics monitors.">
          <Button
            as={Link}
            to={getWorkbenchMonitoringMonitorAbsPath({
              workbenchId,
              monitorId: monitor.id,
            })}
            startIcon={<ReturnIcon />}
          >
            Back to monitor
          </Button>
        </EmptyState>
      </PageSC>
    )

  if (!monitor.service?.id)
    return (
      <PageSC>
        <Title2H1 css={{ marginBottom: 16 }}>{monitor.name}</Title2H1>
        <EmptyState message="This monitor is missing a service binding, so log settings cannot be edited here.">
          <Button
            as={Link}
            to={getWorkbenchMonitoringMonitorAbsPath({
              workbenchId,
              monitorId: monitor.id,
            })}
            startIcon={<ReturnIcon />}
          >
            Back to monitor
          </Button>
        </EmptyState>
      </PageSC>
    )

  return (
    <WorkbenchMonitorSettingsInner
      key={monitor.id}
      workbenchId={workbenchId}
      monitor={monitor}
    />
  )
}

function WorkbenchMonitorSettingsInner({
  workbenchId,
  monitor,
}: {
  workbenchId: string
  monitor: WorkbenchMonitorDetailsFragment
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const { breakpoints } = useTheme()
  const [curStep, setCurStep] = useState<ServiceMonitorStepKey>('description')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [clearCount, setClearCount] = useState(0)

  const { state, update, hasUpdates, reset } =
    useUpdateState<ServiceMonitorAttributes>(
      withLogTool(
        sanitizeInitialFormState(monitor as never, monitor.service?.id ?? ''),
        monitor.query?.log?.tool
      )
    )

  const allowSubmit = hasUpdates && isMonitorFormValid(state)

  const [updateMonitor, { loading: updateLoading, error: updateError }] =
    useUpdateWorkbenchMonitorMutation({
      variables: { id: monitor.id, attributes: state },
      onCompleted: () => {
        popToast({
          content: `${state.name} updated successfully`,
          severity: 'success',
        })
        navigate(
          getWorkbenchMonitoringMonitorAbsPath({
            workbenchId,
            monitorId: monitor.id,
          })
        )
      },
      refetchQueries: ['WorkbenchMonitor', 'WorkbenchMonitors'],
    })

  const [deleteMonitor, { loading: deleteLoading, error: deleteError }] =
    useDeleteMonitorMutation({
      variables: { id: monitor.id },
      onCompleted: () => {
        popToast({ content: 'Monitor deleted', severity: 'success' })
        navigate(getWorkbenchMonitoringAbsPath(workbenchId))
      },
      refetchQueries: ['WorkbenchMonitors'],
    })

  return (
    <PageSC>
      <Title2H1>{state.name || monitor.name}</Title2H1>
      <WrapperSC>
        <SidebarSC>
          {STEPS.map(({ key, label }) => (
            <SidebarBtnSC
              key={key}
              onClick={() => setCurStep(key)}
              $active={key === curStep}
              endIcon={getMonitorFormStepIcon(key, state, true)}
            >
              <Body2BoldP
                $color="text"
                css={{ textAlign: 'left' }}
              >
                {label}
              </Body2BoldP>
            </SidebarBtnSC>
          ))}
          <SidebarActionsSC>
            <Button
              destructive
              onClick={() => setDeleteOpen(true)}
            >
              Delete monitor
            </Button>
            <Button
              secondary
              as={Link}
              to={getWorkbenchMonitoringAbsPath(workbenchId)}
              startIcon={<ReturnIcon />}
            >
              Back to all monitors
            </Button>
            <Button
              disabled={!allowSubmit}
              loading={updateLoading}
              onClick={() => updateMonitor()}
            >
              Update monitor
            </Button>
            {hasUpdates && (
              <Button
                tertiary
                onClick={() => {
                  reset()
                  setClearCount((n) => n + 1)
                }}
              >
                Clear changes
              </Button>
            )}
          </SidebarActionsSC>
        </SidebarSC>
        <Flex
          direction="column"
          gap="large"
          flex={1}
          maxWidth={breakpoints.desktopLarge}
          overflow="auto"
        >
          {(updateError || deleteError) && (
            <GqlError error={updateError || deleteError} />
          )}
          <ServiceMonitorForm
            key={clearCount}
            state={state}
            update={(patch) =>
              update(
                patch.query?.log
                  ? {
                      ...patch,
                      query: {
                        log: {
                          ...state.query.log,
                          ...patch.query.log,
                          ...(state.query.log.tool
                            ? { tool: state.query.log.tool }
                            : {}),
                        },
                      },
                    }
                  : patch
              )
            }
            curStep={curStep}
            isLoading={false}
          />
          <Card
            header={{
              content: (
                <OverlineH3 $color="text">time series preview</OverlineH3>
              ),
              outerProps: { style: { overflow: 'visible' } },
            }}
            css={{ minHeight: 400 }}
          >
            <ServiceMonitorPreview state={state} />
          </Card>
        </Flex>
      </WrapperSC>
      <Confirm
        open={deleteOpen}
        close={() => setDeleteOpen(false)}
        title="Delete monitor"
        text={`Are you sure you want to delete ${monitor.name}?`}
        label="Delete"
        destructive
        loading={deleteLoading}
        error={deleteError}
        submit={() => deleteMonitor()}
      />
    </PageSC>
  )
}

function withLogTool(
  state: ServiceMonitorAttributes,
  tool: Nullable<string>
): ServiceMonitorAttributes {
  if (!tool) return state
  return {
    ...state,
    query: {
      log: {
        ...state.query.log,
        tool,
      },
    },
  }
}

const PageSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: '100%',
  maxHeight: '100%',
  overflow: 'auto',
  padding: theme.spacing.large,
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xlarge,
  flex: 1,
  minHeight: 0,
  width: '100%',
}))

const SidebarSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  width: 203,
  flexShrink: 0,
}))

const SidebarActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  marginTop: 'auto',
  paddingTop: theme.spacing.large,
}))
