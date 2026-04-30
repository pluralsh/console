import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import {
  Button,
  Card,
  CloseIcon,
  Flex,
  IconFrame,
  ListBoxItem,
  Select,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2BoldP } from 'components/utils/typography/Text'
import { WorkbenchJobCreateInput } from 'components/workbenches/workbench/WorkbenchJobCreateInput'
import {
  FlowBasicWithBindingsFragment,
  useFlowWorkbenchesQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function FlowWorkbenchJobLauncher({
  flow,
}: {
  flow: FlowBasicWithBindingsFragment
}) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { data, loading, error } = useFlowWorkbenchesQuery({
    variables: { id: flow.id },
    skip: !flow.id,
  })

  const workbenches = useMemo(
    () => (data?.flow?.workbenches ?? []).filter(isNonNullable),
    [data?.flow?.workbenches]
  )
  const toggle = useCallback(() => setOpen((open) => !open), [])

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  return (
    <div
      ref={ref}
      css={{ position: 'relative', zIndex: theme.zIndexes.modal }}
    >
      <Button onClick={toggle}>Start workbench job</Button>
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <FlowWorkbenchJobPanel
            flow={flow}
            workbenches={workbenches}
            workbenchesLoading={loading && !data}
            workbenchesError={error}
            onClose={() => setOpen(false)}
          />
        </AnimatedWrapperSC>
      ))}
    </div>
  )
}

function FlowWorkbenchJobPanel({
  flow,
  workbenches,
  workbenchesLoading,
  workbenchesError,
  onClose,
}: {
  flow: FlowBasicWithBindingsFragment
  workbenches: WorkbenchTinyFragment[]
  workbenchesLoading: boolean
  workbenchesError: Nullable<Error>
  onClose: () => void
}) {
  const theme = useTheme()
  const [selectedWorkbenchId, setSelectedWorkbenchId] = useState('')

  const selectedWorkbench = useMemo(
    () => workbenches.find((workbench) => workbench.id === selectedWorkbenchId),
    [selectedWorkbenchId, workbenches]
  )

  useEffect(() => {
    if (selectedWorkbenchId && selectedWorkbench) return
    setSelectedWorkbenchId(workbenches[0]?.id ?? '')
  }, [selectedWorkbench, selectedWorkbenchId, workbenches])

  return (
    <Card
      fillLevel={1}
      css={{
        border: theme.borders.input,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        padding: theme.spacing.large,
        width: 568,
      }}
    >
      <Flex
        align="center"
        gap="small"
      >
        <WorkbenchIcon color="icon-light" />
        <Body1P
          $color="text-light"
          css={{ flexGrow: 1 }}
        >
          {`Send "${flow.name}" to Workbench job`}
        </Body1P>
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
          tooltip="Close"
        />
      </Flex>
      <PanelContentSC>
        {workbenchesError && <GqlError error={workbenchesError} />}
        <Flex
          direction="column"
          gap="small"
        >
          <Body2BoldP $color="text">Select workbench</Body2BoldP>
          <Select
            selectedKey={selectedWorkbenchId}
            isDisabled={!workbenchesLoading && !workbenches.length}
            label={
              workbenchesLoading ? (
                <RectangleSkeleton $width="100%" />
              ) : (
                selectedWorkbench?.name || 'No workbenches attached'
              )
            }
            onSelectionChange={(key) => key && setSelectedWorkbenchId(`${key}`)}
          >
            {workbenches.map((workbench) => (
              <ListBoxItem
                key={workbench.id}
                label={workbench.name}
                textValue={workbench.name}
              />
            ))}
          </Select>
        </Flex>
        <Flex
          direction="column"
          gap="small"
        >
          <Body2BoldP $color="text">Flow context</Body2BoldP>
          <FlowContextSC />
        </Flex>
        <WorkbenchJobCreateInput
          workbenchId={selectedWorkbenchId}
          workbenchLoading={workbenchesLoading}
          disabled={!selectedWorkbenchId}
          placeholder="Start typing your question here..."
          wrapperStyles={{ minHeight: 140, maxWidth: '100%' }}
        />
      </PanelContentSC>
    </Card>
  )
}

const AnimatedWrapperSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 32 + theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 160px)',
  transformOrigin: 'top right',
}))

const PanelContentSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  marginTop: theme.spacing.medium,
  minHeight: 0,
  overflowY: 'auto',
}))

const FlowContextSC = styled.div(({ theme }) => ({
  height: 120,
  maxHeight: 120,
  overflowY: 'auto',
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-zero-selected'],
  padding: theme.spacing.medium,
}))
