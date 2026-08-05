import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react'
import {
  Button,
  ButtonProps,
  Card,
  CloseIcon,
  Flex,
  FormField,
  IconFrame,
  InfoOutlineIcon,
  ListBoxItem,
  Popover,
  PopoverWrapper,
  Select,
  SelectButton,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { EditableSkillChipTooltip } from 'components/ai/chatbot/input/autocomplete/EditableSkillChipTooltip'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body1P } from 'components/utils/typography/Text'
import { WorkbenchStartedJobPanel } from 'components/workbenches/common/WorkbenchStartedJobPanel'
import {
  AgentRuntimeType,
  AiInsightFragment,
  useCreateWorkbenchJobMutation,
  useFlowWorkbenchesQuery,
  useWorkbenchesQuery,
  WorkbenchJobFragment,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { buildInsightWorkbenchPrompt } from './insightWorkbenchPrompt'

const POPOVER_WIDTH = 568

export function SendInsightToWorkbenchButton({
  insight,
  flowId,
  ...props
}: {
  insight: Nullable<AiInsightFragment>
  flowId?: Nullable<string>
} & ButtonProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [promptKey, setPromptKey] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [workbenchJob, setWorkbenchJob] = useState<WorkbenchJobFragment | null>(
    null
  )

  const {
    refs: { setReference, setFloating },
    placement,
    strategy,
    x,
    y,
  } = useFloating({
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [
      offset(theme.spacing.small),
      flip({ padding: theme.spacing.small }),
      shift({ padding: theme.spacing.small }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const close = () => {
    setOpen(false)
    setWorkbenchJob(null)
  }

  const popoverMaxHeight =
    y == null
      ? `calc(100vh - ${theme.spacing.medium * 2}px)`
      : `calc(100vh - ${Math.max(y, 0) + theme.spacing.small}px)`

  const openPopover = () => {
    setOpen((value) => {
      if (!value) {
        setPrompt(buildInsightWorkbenchPrompt(insight))
        setPromptKey((key) => key + 1)
        setWorkbenchJob(null)
      }
      return !value
    })
  }

  if (!insight?.id) return null

  return (
    <>
      <Button
        ref={setReference}
        floating
        aria-haspopup="dialog"
        aria-expanded={open}
        startIcon={<WorkbenchIcon />}
        {...props}
        onClick={openPopover}
      >
        Send to workbench
      </Button>
      {open && (
        <FloatingPortal id={theme.portals.default.id}>
          <PopoverWrapper
            $isOpen={open}
            $placement={placement}
            ref={setFloating}
            style={{
              position: strategy,
              left: x ?? 0,
              top: y ?? 0,
              width: POPOVER_WIDTH,
              height: 'auto',
              maxHeight: popoverMaxHeight,
              zIndex: theme.zIndexes.modal,
            }}
          >
            <Popover
              isOpen={open}
              onClose={close}
            >
              <PopoverSC style={{ maxHeight: popoverMaxHeight }}>
                <StretchedFlex>
                  <Flex
                    align="center"
                    gap="xsmall"
                  >
                    <IconFrame
                      size="small"
                      type="tertiary"
                      icon={<WorkbenchIcon />}
                    />
                    <Body1P $color="text-light">
                      Send insights to workbench
                    </Body1P>
                  </Flex>
                  <IconFrame
                    clickable
                    size="small"
                    type="tertiary"
                    tooltip="Close"
                    icon={<CloseIcon color={theme.colors['icon-light']} />}
                    onClick={close}
                  />
                </StretchedFlex>
                {workbenchJob ? (
                  <WorkbenchStartedJobPanel
                    initialJob={workbenchJob}
                    jobId={workbenchJob.id}
                    workbenchId={workbenchJob.workbench?.id ?? ''}
                  />
                ) : (
                  <SendInsightForm
                    flowId={flowId}
                    prompt={prompt}
                    promptKey={promptKey}
                    setPrompt={setPrompt}
                    setWorkbenchJob={setWorkbenchJob}
                  />
                )}
              </PopoverSC>
            </Popover>
          </PopoverWrapper>
        </FloatingPortal>
      )}
    </>
  )
}

function SendInsightForm({
  flowId,
  prompt,
  promptKey,
  setPrompt,
  setWorkbenchJob,
}: {
  flowId?: Nullable<string>
  prompt: string
  promptKey: number
  setPrompt: (prompt: string) => void
  setWorkbenchJob: (job: WorkbenchJobFragment) => void
}) {
  const [workbenchId, setWorkbenchId] = useState<Nullable<string>>(null)
  const { workbenches, loading } = useWorkbenchOptions(flowId)
  const promptInputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWorkbenchId((current) => {
      if (!workbenches.length) return null
      if (workbenches.some((workbench) => workbench.id === current))
        return current
      return workbenches[0]?.id ?? null
    })
  }, [workbenches])

  const [createWorkbenchJob, { loading: mutationLoading, error }] =
    useCreateWorkbenchJobMutation({
      onCompleted: ({ createWorkbenchJob }) =>
        createWorkbenchJob && setWorkbenchJob(createWorkbenchJob),
      refetchQueries: ['WorkbenchJobs', 'RecentWorkbenchJobs'],
      awaitRefetchQueries: true,
    })

  const canSubmit =
    !!workbenchId && !!prompt.trim() && !mutationLoading && !loading

  return (
    <>
      {error && <GqlError error={error} />}
      <FormField
        label={
          <Flex
            align="center"
            gap="xsmall"
          >
            Select a workbench
            <IconFrame
              size="small"
              type="tertiary"
              tooltip="Choose which workbench should investigate this insight with full context."
              icon={<InfoOutlineIcon size={12} />}
            />
          </Flex>
        }
      >
        <FillLevelDiv fillLevel={2}>
          <WorkbenchSelector
            workbenchId={workbenchId}
            setWorkbenchId={setWorkbenchId}
            workbenches={workbenches}
            loading={loading}
          />
        </FillLevelDiv>
      </FormField>
      <PromptInputBoxSC>
        <EditableDiv
          key={promptKey}
          ref={promptInputRef}
          initialValue={prompt}
          setValue={setPrompt}
          deserializePlrlInitialValue
          placeholder="Enter a prompt for the workbench"
          disabled={mutationLoading}
          css={{ minHeight: 200 }}
        />
        <EditableSkillChipTooltip containerRef={promptInputRef} />
      </PromptInputBoxSC>
      <Button
        disabled={!canSubmit}
        loading={mutationLoading}
        alignSelf="end"
        onClick={() =>
          workbenchId &&
          createWorkbenchJob({
            variables: {
              workbenchId,
              attributes: {
                prompt,
                ...(flowId ? { flowId } : {}),
              },
            },
          })
        }
      >
        Send to workbench
      </Button>
    </>
  )
}

function useWorkbenchOptions(flowId?: Nullable<string>) {
  const { data: flowData, loading: flowLoading } = useFlowWorkbenchesQuery({
    variables: { id: flowId ?? '' },
    skip: !flowId,
  })
  const { data: allWorkbenchesData, loading: allWorkbenchesLoading } =
    useWorkbenchesQuery({
      skip: !!flowId,
    })

  const workbenches = useMemo(() => {
    if (flowId) return (flowData?.flow?.workbenches ?? []).filter(isNonNullable)

    return mapExistingNodes(allWorkbenchesData?.workbenches)
  }, [allWorkbenchesData?.workbenches, flowData?.flow?.workbenches, flowId])

  return {
    workbenches,
    loading: flowId ? flowLoading && !flowData : allWorkbenchesLoading,
  }
}

function WorkbenchSelector({
  workbenchId,
  setWorkbenchId,
  workbenches,
  loading,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId: (id: Nullable<string>) => void
  workbenches: WorkbenchTinyFragment[]
  loading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedWorkbench = workbenches.find(
    (workbench) => workbench.id === workbenchId
  )
  const SelectedIcon = selectedWorkbench
    ? runtimeToIcon[
        selectedWorkbench.agentRuntime?.type ?? AgentRuntimeType.Custom
      ]
    : null

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width={POPOVER_WIDTH - 32}
      label="Select workbench"
      isDisabled={!loading && !workbenches.length}
      selectedKey={workbenchId ?? ''}
      onSelectionChange={(key) => setWorkbenchId(key ? `${key}` : null)}
      triggerButton={
        <SelectButton
          css={{ width: '100%' }}
          leftContent={
            SelectedIcon ? (
              <SelectedIcon
                fullColor
                size={16}
              />
            ) : undefined
          }
        >
          {loading ? (
            <RectangleSkeleton
              $bright
              $width={120}
            />
          ) : (
            (selectedWorkbench?.name ?? 'Select workbench')
          )}
        </SelectButton>
      }
    >
      {workbenches.map((workbench) => {
        const ProviderIcon =
          runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]

        return (
          <ListBoxItem
            key={workbench.id}
            label={workbench.name}
            leftContent={
              <ProviderIcon
                fullColor
                size={16}
              />
            }
          />
        )
      })}
    </Select>
  )
}

const PopoverSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
  padding: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-one'],
  boxShadow: theme.boxShadows.moderate,
}))

const PromptInputBoxSC = styled(Card)(({ theme }) => ({
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders.input,
  '&:focus-within': {
    border: theme.borders['outline-focused'],
  },
}))
