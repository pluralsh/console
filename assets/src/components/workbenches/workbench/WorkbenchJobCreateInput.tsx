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
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchSavedPromptsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import isEmpty from 'lodash/isEmpty'
import { Body2P } from '../../utils/typography/Text.tsx'

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
      <InputWrapperSC>
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
  const visiblePrompts = prompts.slice(0, SAVED_PROMPTS_LIMIT)
  const hasMorePrompts = !!data?.workbench?.prompts?.pageInfo.hasNextPage

  if (!open) return null

  return (
    <PromptsPanelSC>
      {error ? (
        <GqlError error={error} />
      ) : promptsLoading && !data ? (
        <OverlayLoadingSC>
          <Spinner />
        </OverlayLoadingSC>
      ) : (
        <PromptListSC>
          {visiblePrompts.map((savedPrompt) => (
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
          {isEmpty(visiblePrompts) && (
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
    </PromptsPanelSC>
  )
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
        whiteSpace: 'pre-wrap',
      }}
    >
      <Body2P>{label}</Body2P>
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
  gap: theme.spacing.small,
  maxHeight: 320,
  overflow: 'hidden auto',
}))

const InputWrapperSC = styled.div({
  position: 'relative',
  maxWidth: MAX_WIDTH,
})

const PromptsPanelSC = styled.div(({ theme }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  marginTop: theme.spacing.xsmall,
  zIndex: theme.zIndexes.selectPopover,
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
