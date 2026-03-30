import {
  Button,
  ButtonProps,
  Flex,
  IconFrame,
  ReturnIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body2BoldP, ButtonMediumP } from 'components/utils/typography/Text'
import { SidebarBtnSC } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import { MonitorFragment, useMonitorDetailsQuery } from 'generated/graphql'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  SERVICE_MONITOR_PARAM_ID,
  SERVICE_OBSERVABILITY_REL_PATH,
} from 'routes/cdRoutesConsts'
import { styled, useTheme } from 'styled-components'
import { useServiceSubPageBreadcrumbs } from '../../ServiceDetails'

type ServiceMonitorStepKey = 'description' | 'threshold-config' | 'log-query'

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
  mode: _mode,
  monitor: _monitor,
  isLoading: _isLoading,
}: {
  mode: 'create' | 'edit'
  monitor: Nullable<MonitorFragment>
  isLoading: boolean
}) {
  const { spacing } = useTheme()
  const [activeKey, setActiveKey] =
    useState<ServiceMonitorStepKey>('description')
  // TODO: add form state

  return (
    <WrapperSC>
      <Flex direction="column">
        {STEPS.map(({ key, label }, i) => (
          <SidebarBtnSC
            key={key}
            tertiary
            onClick={() => setActiveKey(key)}
            $active={key === activeKey}
            innerFlexProps={{ flex: 1 }}
            startIcon={
              <IconFrame
                circle
                type={key === activeKey ? 'floating' : 'secondary'}
                icon={<ButtonMediumP $color="text">{i}</ButtonMediumP>}
              />
            }
            // endIcon={<div>end</div>} TODO
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
        <Button>Create monitor</Button>
      </Flex>
      {/* <ServiceMonitorForm
        state={{}}
        isLoading={isLoading}
      /> */}
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

const STEPS: { key: ServiceMonitorStepKey; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'threshold-config', label: 'Threshold config' },
  { key: 'log-query', label: 'Log query' },
] as const

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xlarge,
  height: '100%',
  width: '100%',
  padding: theme.spacing.large,
  overflow: 'auto',
}))
