import {
  ArrowUpIcon,
  BookmarkIcon,
  Chip,
  Flex,
  IconFrame,
  Spinner,
} from '@pluralsh/design-system'
import chroma from 'chroma-js'
import {
  ChatInputSimple,
  ChatOptionPill,
} from 'components/ai/chatbot/input/ChatInput'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  useCreateWorkbenchJobMutation,
  useCreateWorkbenchPromptMutation,
  useWorkbenchPromptsQuery,
} from 'generated/graphql'
import type { ChatInputSimpleRef } from 'components/ai/chatbot/input/ChatInput'
import type { ComponentProps, RefObject } from 'react'
import { animated, useTransition } from '@react-spring/web'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchSavedPromptsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import isEmpty from 'lodash/isEmpty'
import { Body2P } from '../../utils/typography/Text.tsx'
import { TRUNCATE } from 'components/utils/truncate.ts'

const MAX_WIDTH = 924
const SAVED_PROMPTS_LIMIT = 6

export function WorkbenchJobCreateInput({
  workbenchId,
  workbenchLoading,
}: {
  workbenchId: string
  workbenchLoading: boolean
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const inputRef = useAutofocusRef() as RefObject<Nullable<ChatInputSimpleRef>>
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState('')
  const [savedPromptsOpen, setSavedPromptsOpen] = useState(false)

  const [createWorkbenchJob, { loading, error }] =
    useCreateWorkbenchJobMutation({
      onCompleted: ({ createWorkbenchJob }) =>
        createWorkbenchJob?.id &&
        navigate(
          getWorkbenchJobAbsPath({ workbenchId, jobId: createWorkbenchJob.id })
        ),
      refetchQueries: ['WorkbenchJobs'],
      awaitRefetchQueries: true,
    })

  const [savePrompt, { loading: savePromptLoading }] =
    useCreateWorkbenchPromptMutation()

  useOutsideClick(inputWrapperRef, () => {
    if (!savedPromptsOpen) return
    setSavedPromptsOpen(false)
  })

  const handleSubmitPrompt = (nextPrompt = prompt) => {
    const trimmedPrompt = nextPrompt.trim()

    if (!trimmedPrompt) return

    setPrompt(trimmedPrompt)
    setSavedPromptsOpen(false)
    void createWorkbenchJob({
      variables: { workbenchId, attributes: { prompt: trimmedPrompt } },
    })
  }

  const handleSavePrompt = () => {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) return

    void savePrompt({
      variables: { workbenchId, attributes: { prompt: trimmedPrompt } },
      onCompleted: () => {
        popToast({ name: 'prompt', action: 'saved', color: 'icon-success' })
      },
      onError: () => {
        popToast({
          name: 'prompt',
          action: 'failed to save',
          color: 'icon-danger',
        })
      },
    })
  }

  if (workbenchLoading)
    return (
      <RectangleSkeleton
        $height={130}
        $width="100%"
        css={{ maxWidth: MAX_WIDTH }}
      />
    )

  return (
    <>
      {error && <GqlError error={error} />}
      <InputWrapperSC ref={inputWrapperRef}>
        <ChatInputSimple
          ref={inputRef}
          placeholder="What would you like to investigate?"
          setValue={setPrompt}
          onSubmit={() => handleSubmitPrompt()}
          loading={loading}
          allowSubmit={!!prompt.trim()}
          options={
            <Flex gap="xsmall">
              <ChatOptionPill
                isOpen={savedPromptsOpen}
                disabled={loading}
                onClick={() => setSavedPromptsOpen((open) => !open)}
              >
                <BookmarkIcon size={12} />
                <span>Saved prompts</span>
              </ChatOptionPill>
              {!!prompt.trim() && (
                <IconFrame
                  clickable={!savePromptLoading}
                  size="medium"
                  icon={
                    savePromptLoading ? (
                      <Spinner />
                    ) : (
                      <BookmarkIcon color="icon-light" />
                    )
                  }
                  tooltip="Save this prompt"
                  onClick={handleSavePrompt}
                  css={{ borderRadius: '50%' }}
                />
              )}
            </Flex>
          }
          wrapperStyles={{ maxWidth: MAX_WIDTH }}
        />
        <WorkbenchSavedPromptsOverlay
          open={savedPromptsOpen}
          workbenchId={workbenchId}
          onSelectPrompt={handleSubmitPrompt}
          onShowAll={() => {
            setSavedPromptsOpen(false)
            navigate(getWorkbenchSavedPromptsAbsPath(workbenchId))
          }}
        />
      </InputWrapperSC>
    </>
  )
}

function WorkbenchSavedPromptsOverlay({
  open,
  workbenchId,
  onSelectPrompt,
  onShowAll,
}: {
  open: boolean
  workbenchId: string
  onSelectPrompt: (prompt: string) => void
  onShowAll: () => void
}) {
  const {
    data,
    loading: promptsLoading,
    error,
  } = useWorkbenchPromptsQuery({
    variables: {
      id: workbenchId,
      first: SAVED_PROMPTS_LIMIT,
    },
    skip: !open || !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const prompts = useMemo(
    () => mapExistingNodes(data?.workbench?.prompts),
    [data]
  )
  const visiblePrompts = useMemo(
    () => prompts.slice(0, SAVED_PROMPTS_LIMIT),
    [prompts]
  )
  const hasMorePrompts = !!data?.workbench?.prompts?.pageInfo.hasNextPage
  const showLoading = promptsLoading && !data

  const [lastVisiblePrompts, setLastVisiblePrompts] = useState(visiblePrompts)

  useEffect(() => {
    if (!open) return
    // Preserve chip list during close animation while the query is skipped.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastVisiblePrompts(visiblePrompts)
  }, [open, visiblePrompts])

  const renderedPrompts = open ? visiblePrompts : lastVisiblePrompts

  const theme = useTheme()

  const transitionProps = useMemo(
    () => ({
      from: { opacity: 0, maxHeight: 0, marginTop: 0 },
      enter: { opacity: 1, maxHeight: 480, marginTop: theme.spacing.small },
      leave: { opacity: 0, maxHeight: 0, marginTop: 0 },
      config: open
        ? { mass: 0.6, tension: 280, velocity: 0.02 }
        : { mass: 0.6, tension: 400, velocity: 0.02, restVelocity: 0.1 },
    }),
    [open, theme.spacing.small]
  )

  const transitions = useTransition(open ? [true] : [], transitionProps)

  return transitions((styles) => (
    <AnimatedPromptsPanelSC
      style={{
        opacity: styles.opacity,
        maxHeight: styles.maxHeight,
        marginTop: styles.marginTop,
      }}
    >
      {error ? (
        <GqlError error={error} />
      ) : showLoading ? (
        <OverlayLoadingSC>
          <Spinner />
        </OverlayLoadingSC>
      ) : (
        <PromptListSC>
          {renderedPrompts.map((savedPrompt) => (
            <SavedPromptsChip
              key={savedPrompt.id}
              label={savedPrompt.prompt ?? ''}
              fillLevel={2}
              rightContent={
                <ArrowUpIcon
                  size={12}
                  color="icon-light"
                />
              }
              onClick={() => onSelectPrompt(savedPrompt.prompt ?? '')}
            />
          ))}
          {isEmpty(renderedPrompts) && (
            <EmptyPromptsTextSC>No saved prompts yet.</EmptyPromptsTextSC>
          )}
          {hasMorePrompts && (
            <SavedPromptsChip
              label="Show all saved prompts"
              fillLevel={1}
              onClick={onShowAll}
            />
          )}
        </PromptListSC>
      )}
    </AnimatedPromptsPanelSC>
  ))
}

function SavedPromptsChip({
  label,
  fillLevel,
  rightContent,
  onClick,
}: {
  label: string
  fillLevel?: ComponentProps<typeof Chip>['fillLevel']
  rightContent?: ComponentProps<typeof Chip>['rightContent']
  onClick: () => void
}) {
  return (
    <Chip
      size="large"
      fillLevel={fillLevel}
      clickable
      onClick={onClick}
      css={{
        borderRadius: 16,
        width: 'fit-content',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',

        '.children': {
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        },
      }}
    >
      <Body2P css={{ ...TRUNCATE }}>{label}</Body2P>
      {rightContent}
    </Chip>
  )
}

const OverlayLoadingSC = styled(Flex)({
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 120,
})

const PromptListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing.small,
  maxHeight: 320,
  minWidth: 0,
  overflow: 'hidden auto',
}))

const InputWrapperSC = styled.div({
  position: 'relative',
  maxWidth: MAX_WIDTH,
})

const AnimatedPromptsPanelSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  zIndex: theme.zIndexes.selectPopover,
  boxSizing: 'border-box',
  overflow: 'hidden',
  backdropFilter: 'blur(4px)',
  border: `1px solid ${chroma(theme.colors['border-fill-two']).alpha(0.1).hex()}`,
  borderRadius: theme.borderRadiuses.large,
  padding: theme.spacing.medium,
  backgroundColor: chroma(theme.colors['fill-zero']).alpha(0.4).hex(),
  boxShadow: theme.boxShadows.modal,
}))

const EmptyPromptsTextSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
}))
