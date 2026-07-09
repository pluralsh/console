import {
  Button,
  Card,
  CloseIcon,
  DiscoverIcon,
  Flex,
  FormField,
  IconFrame,
  ListBoxItem,
  Modal,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { WorkbenchStartedJobPanel } from 'components/workbenches/common/WorkbenchStartedJobPanel'
import { EditableSkillChipTooltip } from 'components/ai/chatbot/input/autocomplete/EditableSkillChipTooltip'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import pluralize from 'pluralize'
import {
  AgentRuntimeType,
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

export function VulnFixModal({
  open,
  onClose,
  vulnCount,
  initialPrompt,
  flowId,
}: {
  open: boolean
  onClose: () => void
  vulnCount: number
  initialPrompt: string
  flowId?: Nullable<string>
}) {
  const { colors } = useTheme()
  const headerTitle = `Fix ${pluralize('vulnerability', vulnCount, vulnCount !== 1)}`
  const [prompt, setPrompt] = useState(initialPrompt)
  const [workbenchJob, setWorkbenchJob] = useState<WorkbenchJobFragment | null>(
    null
  )

  return (
    <Modal
      size="large"
      open={open}
      onClose={onClose}
      scrollable
    >
      <Flex
        direction="column"
        gap="large"
      >
        <StretchedFlex>
          <StackedText
            first={headerTitle}
            firstPartialType="body1"
            firstColor="text-light"
            icon={<DiscoverIcon />}
            iconGap="xsmall"
          />
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon color={colors['icon-light']} />}
            onClick={onClose}
          />
        </StretchedFlex>
        {!!workbenchJob ? (
          <WorkbenchStartedJobPanel
            initialJob={workbenchJob}
            jobId={workbenchJob.id}
            workbenchId={workbenchJob.workbench?.id ?? ''}
          />
        ) : (
          <VulnFixForm
            flowId={flowId}
            prompt={prompt}
            setPrompt={setPrompt}
            setWorkbenchJob={setWorkbenchJob}
          />
        )}
      </Flex>
    </Modal>
  )
}

function VulnFixForm({
  flowId,
  prompt,
  setPrompt,
  setWorkbenchJob,
}: {
  flowId?: Nullable<string>
  prompt: string
  setPrompt: (prompt: string) => void
  setWorkbenchJob: (job: WorkbenchJobFragment) => void
}) {
  const [workbenchId, setWorkbenchId] = useState<Nullable<string>>(null)
  const { workbenches, loading } = useWorkbenchOptions(flowId)

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
  const promptInputRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {error && <GqlError error={error} />}
      <FormField label="Select a workbench">
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
          ref={promptInputRef}
          initialValue={prompt}
          setValue={setPrompt}
          deserializePlrlInitialValue
          placeholder="Enter a prompt for the workbench"
          disabled={mutationLoading}
          css={{ height: 280 }}
        />
        <EditableSkillChipTooltip containerRef={promptInputRef} />
      </PromptInputBoxSC>
      <Button
        disabled={!canSubmit}
        loading={mutationLoading}
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
        alignSelf="end"
      >
        Approve fix
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
      width={500}
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

const PromptInputBoxSC = styled(Card)(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  '&:focus-within': {
    border: theme.borders['outline-focused'],
  },
}))
