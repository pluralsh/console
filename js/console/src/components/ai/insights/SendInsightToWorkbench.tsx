import {
  Button,
  ButtonProps,
  Card,
  Flex,
  FormField,
  IconFrame,
  InfoOutlineIcon,
  Modal,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { WorkbenchSelector } from 'components/workbenches/WorkbenchSelector'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { WorkbenchPromptRichInput } from 'components/workbenches/workbench/WorkbenchPromptRichInput'
import { AiInsightFragment } from 'generated/graphql'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getWorkbenchLaunchAbsPath,
  WorkbenchLaunchRouteState,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { buildInsightWorkbenchPrompt } from './insightWorkbenchPrompt'

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
  submitLabel = 'Send to workbench',
  editable = false,
  selectText,
  ...props
}: {
  flowId?: Nullable<string>
  initialPrompt: string
  popoverTitle?: string
  backLabel?: string
  submitLabel?: string
  editable?: boolean
  selectText?: string
} & ButtonProps) {
  const { hasWorkbenches, loading: workbenchesLoading } =
    useWorkbenchOptions(flowId)
  const [open, setOpen] = useState(false)

  if (workbenchesLoading || !hasWorkbenches) return null

  return (
    <>
      <Button
        aria-haspopup="dialog"
        aria-expanded={open}
        startIcon={<WorkbenchIcon />}
        {...props}
        floating={!hasWorkbenches}
        onClick={() => setOpen((value) => !value)}
      >
        {submitLabel}
      </Button>
      <ModalMountTransition open={open}>
        <Modal
          onOpenAutoFocus={(event) => event.preventDefault()}
          size="auto"
          css={{ maxWidth: 1024, minWidth: 608 }}
          open={open}
          onClose={() => setOpen(false)}
          header={popoverTitle}
        >
          <Flex
            direction="column"
            gap="large"
            overflow="hidden"
            maxHeight={560}
          >
            <SendToWorkbenchForm
              flowId={flowId}
              prompt={initialPrompt}
              backLabel={backLabel}
              submitLabel={submitLabel}
              editable={editable}
              selectText={selectText}
            />
          </Flex>
        </Modal>
      </ModalMountTransition>
    </>
  )
}

export function SendToWorkbenchForm({
  flowId,
  prompt,
  backLabel,
  submitLabel = 'Send to workbench',
  editable = false,
  selectText,
}: {
  flowId?: Nullable<string>
  prompt: string
  backLabel?: string
  submitLabel?: string
  editable?: boolean
  selectText?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [workbenchId, setWorkbenchId] = useState<Nullable<string>>(null)
  const [sourcePrompt, setSourcePrompt] = useState(prompt)
  const [draft, setDraft] = useState(prompt)
  const editorRef = useRef<HTMLDivElement>(null)
  const { workbenches, loading } = useWorkbenchOptions(flowId)
  const selectedWorkbenchId =
    (workbenchId &&
    workbenches.some((workbench) => workbench.id === workbenchId)
      ? workbenchId
      : workbenches[0]?.id) ?? null

  if (prompt !== sourcePrompt) {
    setSourcePrompt(prompt)
    setDraft(prompt)
  }

  const effectivePrompt = editable ? draft : prompt

  useEffect(() => {
    if (!editable || !selectText) return

    const id = window.requestAnimationFrame(() => {
      const root = editorRef.current?.querySelector('[contenteditable="true"]')
      if (root instanceof HTMLElement) selectPlainText(root, selectText)
    })
    return () => window.cancelAnimationFrame(id)
  }, [editable, prompt, selectText])

  const canSubmit =
    !!selectedWorkbenchId && !!effectivePrompt.trim() && !loading

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
      {editable ? (
        <FormField
          label="Prompt"
          hint={
            selectText
              ? 'Replace the placeholder with the change you want applied.'
              : undefined
          }
        >
          <div ref={editorRef}>
            <WorkbenchPromptRichInput
              syncKey={prompt}
              workbenchId={selectedWorkbenchId}
              prompt={prompt}
              onPromptChange={setDraft}
              deserializePlrlInitialValue={false}
              wrapperStyles={{
                minHeight: 132,
                maxHeight: 241,
                overflow: 'auto',
              }}
            />
          </div>
        </FormField>
      ) : (
        <PromptPreviewBoxSC>
          <WorkbenchStoredPromptMarkdown
            text={prompt}
            promptColor="text-light"
          />
        </PromptPreviewBoxSC>
      )}
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
              state: {
                prompt: effectivePrompt,
              } satisfies WorkbenchLaunchRouteState,
            }
          )
        }}
      >
        {submitLabel}
      </Button>
    </>
  )
}

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

function selectPlainText(root: HTMLElement, text: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const value = node.textContent ?? ''
    const index = value.indexOf(text)
    if (index === -1) continue

    const range = document.createRange()
    range.setStart(node, index)
    range.setEnd(node, index + text.length)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    return
  }
}
