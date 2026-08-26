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
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { TRUNCATE } from 'components/utils/truncate'
import { Body1P, Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import {
  AgentRuntimeType,
  AiInsightFragment,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getWorkbenchLaunchAbsPath,
  WorkbenchLaunchRouteState,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { buildInsightWorkbenchPrompt } from './insightWorkbenchPrompt'
import { isNonNullable } from 'utils/isNonNullable'

const POPOVER_WIDTH = 568
const MAX_VISIBLE_TOOLS = 5

export function SendInsightToWorkbenchButton({
  insight,
  flowId,
  ...props
}: {
  insight: Nullable<AiInsightFragment>
  flowId?: Nullable<string>
} & ButtonProps) {
  if (!insight?.id) return null

  return (
    <SendToWorkbenchButton
      initialPrompt={buildInsightWorkbenchPrompt(insight)}
      popoverTitle="Send insights to workbench"
      backLabel="Insights"
      flowId={flowId}
      {...props}
    />
  )
}

export function SendToWorkbenchButton({
  flowId,
  initialPrompt,
  popoverTitle = 'Send to workbench',
  backLabel,
  ...props
}: {
  flowId?: Nullable<string>
  initialPrompt: string
  popoverTitle?: string
  backLabel?: string
} & ButtonProps) {
  const { hasWorkbenches, loading: workbenchesLoading } =
    useWorkbenchOptions(flowId)
  const theme = useTheme()
  const [open, setOpen] = useState(false)

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

  const close = () => setOpen(false)

  const popoverMaxHeight =
    y == null
      ? `calc(100vh - ${theme.spacing.medium * 2}px)`
      : `calc(100vh - ${Math.max(y, 0) + theme.spacing.small}px)`

  if (workbenchesLoading || !hasWorkbenches) return null

  return (
    <>
      <Button
        ref={setReference}
        aria-haspopup="dialog"
        aria-expanded={open}
        startIcon={<WorkbenchIcon />}
        {...props}
        floating={!hasWorkbenches}
        onClick={() => setOpen((value) => !value)}
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
                    <Body1P $color="text-light">{popoverTitle}</Body1P>
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
                <SendToWorkbenchForm
                  flowId={flowId}
                  prompt={initialPrompt}
                  backLabel={backLabel}
                />
              </PopoverSC>
            </Popover>
          </PopoverWrapper>
        </FloatingPortal>
      )}
    </>
  )
}

export function SendToWorkbenchForm({
  flowId,
  prompt,
  backLabel,
  submitLabel = 'Send to workbench',
}: {
  flowId?: Nullable<string>
  prompt: string
  backLabel?: string
  submitLabel?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [workbenchId, setWorkbenchId] = useState<Nullable<string>>(null)
  const { workbenches, loading } = useWorkbenchOptions(flowId)
  const selectedWorkbenchId =
    (workbenchId &&
    workbenches.some((workbench) => workbench.id === workbenchId)
      ? workbenchId
      : workbenches[0]?.id) ?? null

  const canSubmit = !!selectedWorkbenchId && !!prompt.trim() && !loading

  return (
    <>
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
              tooltip="Choose which workbench should investigate this with full context."
              icon={<InfoOutlineIcon size={12} />}
            />
          </Flex>
        }
      >
        <FillLevelDiv fillLevel={2}>
          <WorkbenchSelector
            workbenchId={selectedWorkbenchId}
            setWorkbenchId={setWorkbenchId}
            workbenches={workbenches}
            loading={loading}
          />
        </FillLevelDiv>
      </FormField>
      <PromptPreviewBoxSC>
        <WorkbenchStoredPromptMarkdown
          text={prompt}
          promptColor="text-light"
        />
      </PromptPreviewBoxSC>
      <Button
        disabled={!canSubmit}
        alignSelf="end"
        onClick={() => {
          if (!selectedWorkbenchId) return
          navigate(
            getWorkbenchLaunchAbsPath({
              workbenchId: selectedWorkbenchId,
              backTo: `${location.pathname}${location.search}`,
              backLabel,
            }),
            {
              state: { prompt } satisfies WorkbenchLaunchRouteState,
            }
          )
        }}
      >
        {submitLabel}
      </Button>
    </>
  )
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
          css={{
            width: '100%',
            '.children': { minWidth: 0, overflow: 'hidden' },
            '.content': { paddingTop: 10, paddingBottom: 10 },
          }}
          rightContent={
            selectedWorkbench ? (
              <WorkbenchToolIcons workbench={selectedWorkbench} />
            ) : undefined
          }
        >
          {loading ? (
            <RectangleSkeleton
              $bright
              $width={120}
            />
          ) : selectedWorkbench ? (
            <WorkbenchOptionLabel workbench={selectedWorkbench} />
          ) : (
            'Select workbench'
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
            description={workbench.description ?? undefined}
            descriptionProps={{ style: TRUNCATE }}
            leftContent={
              <ProviderIcon
                fullColor
                size={16}
              />
            }
            rightContent={<WorkbenchToolIcons workbench={workbench} />}
          />
        )
      })}
    </Select>
  )
}

function WorkbenchOptionLabel({
  workbench,
}: {
  workbench: WorkbenchTinyFragment
}) {
  const ProviderIcon =
    runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]

  return (
    <Flex
      direction="column"
      minWidth={0}
    >
      <Flex
        align="center"
        gap="xsmall"
        minWidth={0}
      >
        <ProviderIcon
          fullColor
          size={16}
        />
        <Body2P css={{ ...TRUNCATE, minWidth: 0 }}>{workbench.name}</Body2P>
      </Flex>
      {workbench.description && (
        <CaptionP
          $color="text-xlight"
          css={{ ...TRUNCATE, minWidth: 0 }}
        >
          {workbench.description}
        </CaptionP>
      )}
    </Flex>
  )
}

function WorkbenchToolIcons({
  workbench,
}: {
  workbench: WorkbenchTinyFragment
}) {
  const tools = workbench.tools?.filter(isNonNullable) ?? []
  if (!tools.length) return null

  return (
    <MetadataIcons
      maxVisibleItems={MAX_VISIBLE_TOOLS}
      items={tools.map((tool) => ({
        id: tool.id,
        label: tool.name,
        icon: (
          <WorkbenchToolIcon
            type={tool.tool}
            provider={tool.cloudConnection?.provider}
            size={12}
          />
        ),
      }))}
    />
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

const PromptPreviewBoxSC = styled(Card)(({ theme }) => ({
  flex: '1 1 auto',
  minHeight: 132,
  maxHeight: 241,
  overflowY: 'auto',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders.input,
  color: theme.colors['text-light'],
}))
