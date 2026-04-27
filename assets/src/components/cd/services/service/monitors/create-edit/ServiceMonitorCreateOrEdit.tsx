import {
  Button,
  ButtonProps,
  Card,
  CheckOutlineIcon,
  CircleDashIcon,
  CloseIcon,
  ErrorOutlineIcon,
  Flex,
  IconFrame,
  ReturnIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  Body2BoldP,
  ButtonMediumP,
  OverlineH3,
} from 'components/utils/typography/Text'
import { SidebarBtnSC } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import {
  AlertSeverity,
  MonitorAggregate,
  MonitorAttributes,
  MonitorFragment,
  MonitorLogQueryFragment,
  MonitorOperator,
  MonitorType,
  useCreateMonitorMutation,
  useMonitorDetailsQuery,
  useUpdateMonitorMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  SERVICE_MONITOR_PARAM_ID,
  SERVICE_OBSERVABILITY_REL_PATH,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { styled, useTheme } from 'styled-components'
import { useServiceSubPageBreadcrumbs } from '../../ServiceDetails'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  DURATION_OPTIONS,
  BUCKET_SIZE_OPTIONS,
  ServiceMonitorForm,
} from './ServiceMonitorForm'
import { isNil } from 'lodash'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { ServiceMonitorPreview } from './ServiceMonitorPreview'
import { isNonNullable } from 'utils/isNonNullable'

export type ServiceMonitorStepKey =
  | 'description'
  | 'threshold-config'
  | 'log-query'

const STEPS: { key: ServiceMonitorStepKey; label: string }[] = [
  { key: 'log-query', label: 'Log query' },
  { key: 'threshold-config', label: 'Threshold config' },
  { key: 'description', label: 'Description' },
] as const

export function ServiceMonitorCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  useServiceSubPageBreadcrumbs(SERVICE_OBSERVABILITY_REL_PATH)

  const id = useParams()[SERVICE_MONITOR_PARAM_ID] ?? ''
  const { data, loading, error } = useMonitorDetailsQuery({
    skip: !id || mode === 'create',
    variables: { id },
    fetchPolicy: 'network-only',
  })
  const monitor = data?.monitor
  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
        action={<BackButton />}
      />
    )
  return (
    <ServiceMonitorCreateOrEditInner
      key={monitor?.id ?? 'create'}
      mode={mode}
      monitor={monitor}
      isLoading={!monitor && loading}
    />
  )
}

function ServiceMonitorCreateOrEditInner({
  mode,
  monitor,
  isLoading,
}: {
  mode: 'create' | 'edit'
  monitor: Nullable<MonitorFragment>
  isLoading: boolean
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const serviceId = useParams()[SERVICE_PARAM_ID] ?? ''
  const [clearCount, setClearCount] = useState(0)
  const { spacing, breakpoints } = useTheme()
  const [curStep, setCurStepState] =
    useState<ServiceMonitorStepKey>('log-query')
  const [visitedSteps, setVisitedSteps] = useState<Set<ServiceMonitorStepKey>>(
    () => new Set()
  )
  const setCurStep = (newStep: ServiceMonitorStepKey) => {
    setVisitedSteps((prev) => prev.add(curStep))
    setCurStepState(newStep)
  }
  const { state, update, hasUpdates, reset } =
    useUpdateState<MonitorAttributes>(
      sanitizeInitialFormState(monitor, serviceId)
    )
  const allowSubmit = hasUpdates && isFormValid(state)
  const onSuccess = (shouldNav: boolean) => {
    if (shouldNav) navigate('..', { relative: 'path' })
    popToast({
      name: state.name,
      action: mode === 'create' ? 'created' : 'updated',
      suffix: 'successfully',
      severity: 'success',
    })
  }
  const [createMonitor, { loading: createLoading, error: createError }] =
    useCreateMonitorMutation({
      variables: { attributes: state },
      onCompleted: () => onSuccess(true),
    })
  const [updateMonitor, { loading: updateLoading, error: updateError }] =
    useUpdateMonitorMutation({
      variables: { id: monitor?.id ?? '', attributes: state },
      onCompleted: () => onSuccess(false),
    })
  const mutationLoading = createLoading || updateLoading
  const mutationError = createError || updateError

  return (
    <WrapperSC>
      <Flex direction="column">
        {STEPS.map(({ key, label }, i) => (
          <SidebarBtnSC
            key={key}
            onClick={() => setCurStep(key)}
            $active={key === curStep}
            innerFlexProps={{ flex: 1 }}
            startIcon={
              <IconFrame
                circle
                type={key === curStep ? 'floating' : 'secondary'}
                icon={<ButtonMediumP $color="text">{i + 1}</ButtonMediumP>}
              />
            }
            endIcon={
              visitedSteps.has(key) ? (
                getStepIcon(key, state, mode === 'edit')
              ) : mode === 'create' ? (
                <CircleDashIcon size={12} />
              ) : null
            }
          >
            <Body2BoldP
              $color="text"
              css={{ textAlign: 'left' }}
            >
              {label}
            </Body2BoldP>
          </SidebarBtnSC>
        ))}
        <BackButton
          secondary
          css={{ marginTop: 'auto', marginBottom: spacing.xsmall }}
        />
        <Flex gap="xsmall">
          {mode === 'edit' && (
            <IconFrame
              clickable
              size="large"
              type="floating"
              disabled={!hasUpdates}
              onClick={() => {
                reset()
                setClearCount((prev) => prev + 1)
              }}
              icon={<CloseIcon />}
              tooltip="Clear changes"
            />
          )}
          <Button
            flex={1}
            disabled={!allowSubmit}
            loading={mutationLoading}
            onClick={() =>
              mode === 'create' ? createMonitor() : updateMonitor()
            }
          >
            {mode === 'create' ? 'Create' : 'Update'} monitor
          </Button>
        </Flex>
      </Flex>
      <Flex
        direction="column"
        gap="large"
        flex={1}
        maxWidth={breakpoints.desktopLarge}
        overflow="auto"
      >
        {mutationError && <GqlError error={mutationError} />}
        <ServiceMonitorForm
          key={clearCount} // forces state reset when changes are cleared, particularly useful for editable divs
          state={state}
          update={update}
          curStep={curStep}
          isLoading={isLoading}
        />
        <Card
          header={{
            content: <OverlineH3 $color="text">log query preview</OverlineH3>,
            outerProps: { style: { overflow: 'visible' } },
          }}
          css={{ minHeight: 400 }}
        >
          <ServiceMonitorPreview state={state} />
        </Card>
      </Flex>
    </WrapperSC>
  )
}

function BackButton(props: ButtonProps) {
  return (
    <Button
      as={Link}
      to=".." // clears the current end path
      relative="path"
      startIcon={<ReturnIcon />}
      {...props}
    >
      Back to all monitors
    </Button>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xlarge,
  maxHeight: '100%',
  width: '100%',
  padding: theme.spacing.large,
  overflow: 'auto',
}))

const sanitizeInitialFormState = (
  monitor: Nullable<MonitorFragment>,
  serviceId: string
): MonitorAttributes => {
  const {
    name = '',
    evaluationCron = '',
    severity = AlertSeverity.Undefined,
    type = MonitorType.Log,
    query: initialQuery,
    threshold: initialThreshold,
  } = monitor ?? {}
  const { log } = initialQuery ?? {}
  const query = {
    log: {
      bucketSize: log?.bucketSize ?? BUCKET_SIZE_OPTIONS[0],
      duration: log?.duration ?? DURATION_OPTIONS[0],
      operator: log?.operator ?? MonitorOperator.And,
      facets: facetArrToAttributeArr(log?.facets ?? []),
      query: log?.query ?? '',
    },
  }
  const { value, aggregate } = initialThreshold ?? {}
  const threshold = {
    value: value ?? 0,
    aggregate: aggregate ?? MonitorAggregate.Max,
  }
  return {
    name,
    evaluationCron,
    query,
    severity,
    type,
    threshold,
    serviceId: monitor?.service?.id ?? serviceId,
    ...(monitor?.workbench?.id && { workbenchId: monitor.workbench.id }),
  }
}

const facetArrToAttributeArr = (arr: MonitorLogQueryFragment['facets']) =>
  arr?.filter(isNonNullable)?.map(({ key, value }) => ({ key, value })) ?? []

const getStepIcon = (
  key: ServiceMonitorStepKey,
  state: MonitorAttributes,
  onlyShowFailures: boolean = false
) => {
  const { name, evaluationCron, threshold, query } = state
  const { value, aggregate } = threshold
  const { query: q, bucketSize, duration, operator } = query.log
  const validIcon = onlyShowFailures ? null : (
    <CheckOutlineIcon
      size={12}
      color="icon-success"
    />
  )
  const invalidIcon = (
    <ErrorOutlineIcon
      size={12}
      color="icon-danger"
    />
  )
  switch (key) {
    case 'description':
      return name && evaluationCron ? validIcon : invalidIcon
    case 'threshold-config':
      return !isNil(value) && aggregate ? validIcon : invalidIcon
    case 'log-query':
      return q && bucketSize && duration && operator ? validIcon : invalidIcon
    default:
      return null
  }
}

const isFormValid = (state: MonitorAttributes) => {
  const { name, evaluationCron, threshold, query } = state
  const { value, aggregate } = threshold
  const { query: q, bucketSize, duration, operator } = query.log
  return (
    name &&
    evaluationCron &&
    !isNil(value) &&
    aggregate &&
    q &&
    bucketSize &&
    duration &&
    operator
  )
}
