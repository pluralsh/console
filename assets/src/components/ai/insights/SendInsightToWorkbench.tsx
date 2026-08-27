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
  Popover,
  PopoverWrapper,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body1P } from 'components/utils/typography/Text'
import { WorkbenchSelector } from 'components/workbenches/WorkbenchSelector'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { AiInsightFragment } from 'generated/graphql'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getWorkbenchLaunchAbsPath,
  WorkbenchLaunchRouteState,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
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
            placement="left"
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
