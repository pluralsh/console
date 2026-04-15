import {
  ArrowTopRightIcon,
  ArrowUpIcon,
  BookmarkIcon,
  Chip,
  ChipProps,
  Flex,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import chroma from 'chroma-js'
import type { ChatInputSimpleRef } from 'components/ai/chatbot/input/ChatInput'
import {
  ChatInputSimple,
  ChatOptionPill,
} from 'components/ai/chatbot/input/ChatInput'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { VirtualList } from 'components/utils/VirtualList'
import {
  useCreateWorkbenchJobMutation,
  useWorkbenchPromptsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import truncate from 'lodash/truncate'
import type { ComponentProps, RefObject } from 'react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchSavedPromptsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { Body2P } from '../../utils/typography/Text.tsx'
import { SaveWorkbenchPromptButton } from './SaveWorkbenchPromptButton'

const MAX_WIDTH = 924

export function WorkbenchJobCreateInput({
  workbenchId,
  workbenchLoading,
}: {
  workbenchId: string
  workbenchLoading: boolean
}) {
  const navigate = useNavigate()
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
            <Flex
              gap="xsmall"
              height={32}
            >
              <ChatOptionPill
                isOpen={savedPromptsOpen}
                disabled={loading}
                onClick={() => setSavedPromptsOpen((open) => !open)}
              >
                <BookmarkIcon size={12} />
                <span>Saved prompts</span>
              </ChatOptionPill>
              <SaveWorkbenchPromptButton
                workbenchId={workbenchId}
                prompt={prompt}
              />
            </Flex>
          }
          wrapperStyles={{ maxWidth: MAX_WIDTH }}
        />
        <WorkbenchSavedPromptsOverlay
          open={savedPromptsOpen}
          workbenchId={workbenchId}
          onSelectPrompt={handleSubmitPrompt}
        />
      </InputWrapperSC>
    </>
  )
}

function WorkbenchSavedPromptsOverlay({
  open,
  workbenchId,
  onSelectPrompt,
}: {
  open: boolean
  workbenchId: string
  onSelectPrompt: (prompt: string) => void
}) {
  // this will get fetched fresh by SaveWorkbenchPromptButton, so we can rely on cache here
  const {
    data,
    loading: promptsLoading,
    error,
  } = useWorkbenchPromptsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })

  const prompts = useMemo(
    () => mapExistingNodes(data?.workbench?.prompts),
    [data]
  )
  const isLoading = promptsLoading && !data
  const noPrompts = isEmpty(prompts) && !isLoading

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
      ) : noPrompts ? (
        <Body2P $color="text-xlight">No saved prompts yet.</Body2P>
      ) : (
        <VirtualList
          data={prompts}
          itemGap="small"
          style={{ height: Math.min(320, (prompts.length + 1) * 44) }}
          loading={isLoading}
          skeletonProps={{ numRows: 6, gap: 'small' }}
          renderer={({ rowData }) => (
            <SavedPromptsChip
              label={rowData.prompt ?? ''}
              fillLevel={2}
              rightContent={
                <ArrowUpIcon
                  size={12}
                  color="icon-light"
                />
              }
              onClick={() => onSelectPrompt(rowData.prompt ?? '')}
            />
          )}
        />
      )}
      {!noPrompts && (
        <SavedPromptsChip
          label="View all saved prompts"
          fillLevel={1}
          forwardedAs={Link}
          to={getWorkbenchSavedPromptsAbsPath(workbenchId)}
          endIcon={
            <ArrowTopRightIcon
              size={12}
              color="icon-light"
            />
          }
        />
      )}
    </AnimatedPromptsPanelSC>
  ))
}

function SavedPromptsChip({
  label,
  fillLevel,
  rightContent,
  ...props
}: {
  label: string
  fillLevel?: ComponentProps<typeof Chip>['fillLevel']
  rightContent?: ComponentProps<typeof Chip>['rightContent']
} & ChipProps) {
  const [showRightContent, setShowRightContent] = useState(false)

  return (
    <Chip
      size="large"
      fillLevel={fillLevel}
      clickable
      onMouseEnter={() => setShowRightContent(true)}
      onMouseLeave={() => setShowRightContent(false)}
      onFocus={() => setShowRightContent(true)}
      onBlur={() => setShowRightContent(false)}
      style={{ borderRadius: 16, width: 'fit-content' }}
      {...props}
    >
      {truncate(label, { length: 116 })}
      {rightContent && (
        <span
          css={{
            width: showRightContent ? 'fit-content' : 0,
            opacity: showRightContent ? 1 : 0,
            transition: 'width 200ms ease, opacity 200ms ease',
          }}
        >
          {rightContent}
        </span>
      )}
    </Chip>
  )
}

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
