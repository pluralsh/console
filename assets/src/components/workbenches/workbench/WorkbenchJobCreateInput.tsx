import {
  AddIcon,
  BookmarkIcon,
  Flex,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  Tooltip,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import type { ChatInputSimpleRef } from 'components/ai/chatbot/input/ChatInput'
import {
  ChatInputSimple,
  ChatOptionPill,
} from 'components/ai/chatbot/input/ChatInput'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  useCreateWorkbenchJobMutation,
  useWorkbenchesQuery,
  useWorkbenchPromptsQuery,
  WorkbenchJobFragment,
  WorkbenchPromptFragment,
} from 'generated/graphql'
import groupBy from 'lodash/groupBy'
import isEmpty from 'lodash/isEmpty'
import type { ComponentProps } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchSavedPromptCreateAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { SaveWorkbenchPromptButton } from './SaveWorkbenchPromptButton'
import { prettifyPrompt } from 'components/utils/contentEditableChips.ts'

const MAX_WIDTH = 924

export function WorkbenchJobCreateInput({
  workbenchId,
  setWorkbenchId,
  workbenchLoading,
  disabled = false,
  onCreated,
  placeholder = 'Send a job to your workbench.  Use / for skills and @ to mention clusters, services or stacks',
  wrapperStyles,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId?: (id: Nullable<string>) => void
  workbenchLoading: boolean
  disabled?: boolean
  onCreated?: (job: WorkbenchJobFragment) => void
  placeholder?: string
  wrapperStyles?: ComponentProps<typeof ChatInputSimple>['wrapperStyles']
}) {
  const navigate = useNavigate()
  const inputRef = useAutofocusRef<ChatInputSimpleRef>()
  const [prompt, setPrompt] = useState('')
  const [promptSyncKey, setPromptSyncKey] = useState(0)

  useEffect(() => {
    if (promptSyncKey > 0) inputRef.current?.focus()
  }, [inputRef, promptSyncKey])

  const [createWorkbenchJob, { loading, error }] =
    useCreateWorkbenchJobMutation({
      onCompleted: ({ createWorkbenchJob }) => {
        if (!createWorkbenchJob?.id) return
        if (onCreated) {
          onCreated(createWorkbenchJob)
          return
        }
        if (workbenchId)
          navigate(
            getWorkbenchJobAbsPath({
              workbenchId,
              jobId: createWorkbenchJob.id,
            })
          )
      },
      refetchQueries: ['WorkbenchJobs', 'RecentWorkbenchJobs'],
      awaitRefetchQueries: true,
    })

  const handleSelectSavedPrompt = (nextPrompt: string) => {
    setPrompt(nextPrompt)
    setPromptSyncKey((key) => key + 1)
  }

  const handleSubmitPrompt = (nextPrompt?: string) => {
    const trimmedPrompt = (nextPrompt ?? prompt).trim()

    if (!trimmedPrompt || !workbenchId) return

    setPrompt(trimmedPrompt)
    createWorkbenchJob({
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
      <InputWrapperSC>
        <ChatInputSimple
          key={`workbench-job-create-prompt-${promptSyncKey}`}
          ref={inputRef}
          disabled={disabled}
          placeholder={placeholder}
          initialValue={prompt}
          deserializePlrlInitialValue
          setValue={setPrompt}
          onSubmit={() => handleSubmitPrompt()}
          loading={loading}
          allowSubmit={!!prompt.trim() && !!workbenchId && !disabled}
          enableAutoComplete
          workbenchId={workbenchId}
          options={
            <Flex
              gap="xsmall"
              height={32}
            >
              {setWorkbenchId && (
                <WorkbenchPillSelector
                  workbenchId={workbenchId}
                  setWorkbenchId={setWorkbenchId}
                />
              )}
              {workbenchId && (
                <>
                  <WorkbenchSavedPrompts
                    workbenchId={workbenchId}
                    disabled={loading}
                    onSelectPrompt={handleSelectSavedPrompt}
                  />
                  <SaveWorkbenchPromptButton
                    workbenchId={workbenchId}
                    prompt={prompt}
                  />
                </>
              )}
            </Flex>
          }
          wrapperStyles={{ maxWidth: MAX_WIDTH, ...wrapperStyles }}
        />
      </InputWrapperSC>
    </>
  )
}

function WorkbenchPillSelector({
  workbenchId,
  setWorkbenchId,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId: (id: Nullable<string>) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { data, loading } = useWorkbenchesQuery({
    fetchPolicy: 'cache-and-network',
  })
  const workbenches = useMemo(() => mapExistingNodes(data?.workbenches), [data])
  const selectedWorkbench = workbenches.find((w) => w.id === workbenchId)

  // clear a persisted id that no longer maps to an existing workbench
  useEffect(() => {
    if (data && workbenchId && !selectedWorkbench) setWorkbenchId(null)
  }, [data, workbenchId, selectedWorkbench, setWorkbenchId])

  return (
    <Select
      transparent
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width={240}
      placement="left"
      label="Select workbench"
      selectedKey={workbenchId ?? ''}
      onSelectionChange={(key) => setWorkbenchId(key ? `${key}` : null)}
      triggerButton={
        <ChatOptionPill
          isOpen={isOpen}
          css={{ height: '100%' }}
        >
          <WorkbenchIcon size={12} />
          {!data && loading ? (
            <RectangleSkeleton
              $bright
              $width={75}
            />
          ) : (
            <span>{selectedWorkbench?.name ?? 'Select workbench'}</span>
          )}
        </ChatOptionPill>
      }
    >
      {workbenches.map(({ id, name }) => (
        <ListBoxItem
          key={id}
          label={name}
          leftContent={<WorkbenchIcon size={12} />}
        />
      ))}
    </Select>
  )
}

function WorkbenchSavedPrompts({
  workbenchId,
  disabled,
  onSelectPrompt,
}: {
  workbenchId: string
  disabled: boolean
  onSelectPrompt: (prompt: string) => void
}) {
  const navigate = useNavigate()
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<{
    title: string
    promptText: string
    category: string
    rect: DOMRect
  } | null>(null)

  const { data, loading } = useWorkbenchPromptsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })

  const prompts = useMemo(
    () => mapExistingNodes(data?.workbench?.prompts),
    [data]
  )

  const promptsById = useMemo(
    () => new Map(prompts.map((prompt) => [prompt.id, prompt])),
    [prompts]
  )

  const groupedPrompts = useMemo(
    () => groupSavedPromptsByCategory(prompts),
    [prompts]
  )

  useEffect(() => {
    if (!isOpen) setHoverPreview(null)
  }, [isOpen])

  return (
    <>
      <Select
        transparent
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        selectedKey=""
        label="Saved prompts"
        width={460}
        maxHeight={360}
        placement="left"
        isDisabled={disabled || (loading && !data)}
        onSelectionChange={(key) => {
          const savedPrompt = key ? promptsById.get(`${key}`) : null
          if (!savedPrompt?.prompt?.trim()) return

          onSelectPrompt(savedPrompt.prompt)
          setIsOpen(false)
        }}
        triggerButton={
          <ChatOptionPill
            isOpen={isOpen}
            disabled={disabled}
            css={{ height: '100%' }}
          >
            <BookmarkIcon size={12} />
            <span>Saved prompts</span>
          </ChatOptionPill>
        }
        dropdownFooterFixed={
          <ListBoxFooterPlus
            leftContent={
              <AddIcon
                size={16}
                color="text-primary-accent"
              />
            }
            onClick={() => {
              setIsOpen(false)
              navigate(getWorkbenchSavedPromptCreateAbsPath(workbenchId))
            }}
          >
            New prompt
          </ListBoxFooterPlus>
        }
      >
        {isEmpty(groupedPrompts) ? (
          <ListBoxItem
            key="empty"
            label="No saved prompts yet"
            disabled
          />
        ) : (
          groupedPrompts.flatMap(([category, categoryPrompts]) => [
            <SavedPromptCategoryHeader
              key={`category:${category}`}
              category={category}
            />,
            ...categoryPrompts.map((savedPrompt) => {
              const title = displaySavedPromptTitle(savedPrompt.title)
              const promptText = prettifyPrompt(savedPrompt.prompt ?? '')

              return (
                <ListBoxItem
                  key={savedPrompt.id}
                  label={title}
                  description={promptText}
                  textValue={title}
                  onMouseEnter={(event) =>
                    setHoverPreview({
                      title,
                      promptText,
                      category,
                      rect: event.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onMouseLeave={() => setHoverPreview(null)}
                  css={{
                    width: '100%',
                    '.center-content': {
                      flex: 1,
                      minWidth: 0,
                      width: 'auto',
                      maxWidth: '100%',
                    },
                    '.description': {
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                    },
                  }}
                />
              )
            }),
          ])
        )}
      </Select>
      {hoverPreview && (
        <Tooltip
          displayOn="manual"
          manualOpen
          placement="right"
          arrow={false}
          offset={theme.spacing.large}
          label={
            <Flex
              direction="column"
              gap="small"
              width={320}
            >
              <Flex
                direction="column"
                gap="xxxsmall"
              >
                <div
                  css={{
                    ...theme.partials.text.body2Bold,
                    color: theme.colors.text,
                  }}
                >
                  {hoverPreview.title}
                </div>
                <div
                  css={{
                    ...theme.partials.text.caption,
                    color: theme.colors['text-xlight'],
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                  }}
                >
                  {hoverPreview.promptText}
                </div>
              </Flex>
              <div
                css={{
                  backgroundColor: theme.colors['fill-one'],
                  borderRadius: theme.borderRadiuses.medium,
                  padding: theme.spacing.small,
                  ...theme.partials.text.body2,
                  color: theme.colors.text,
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                }}
              >
                {hoverPreview.promptText}
              </div>
              <div
                css={{
                  ...theme.partials.text.caption,
                  color: theme.colors['text-xlight'],
                }}
              >
                Category: {hoverPreview.category}
              </div>
            </Flex>
          }
          style={{
            padding: theme.spacing.medium,
            maxWidth: 360,
            pointerEvents: 'none',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'fixed',
              pointerEvents: 'none',
              left: hoverPreview.rect.left,
              top: hoverPreview.rect.top,
              width: hoverPreview.rect.width,
              height: hoverPreview.rect.height,
            }}
          />
        </Tooltip>
      )}
    </>
  )
}

function SavedPromptCategoryHeader({ category }: { category: string }) {
  const theme = useTheme()

  return (
    <ListBoxItem
      label={category}
      disabled
      textValue=""
      css={{
        paddingTop: theme.spacing.small,
        paddingBottom: theme.spacing.small,
        cursor: 'default',
        pointerEvents: 'none',
        '&:hover': { backgroundColor: 'transparent' },
        '.label': {
          ...theme.partials.text.overline,
          color: theme.colors['text-xlight'],
        },
      }}
    />
  )
}

function groupSavedPromptsByCategory(prompts: WorkbenchPromptFragment[]) {
  const grouped = groupBy(prompts, (prompt) =>
    displaySavedPromptCategory(prompt.category)
  )

  return Object.entries(grouped)
    .sort(([leftCategory], [rightCategory]) =>
      leftCategory.localeCompare(rightCategory)
    )
    .map(
      ([category, categoryPrompts]) =>
        [
          category,
          [...categoryPrompts].sort(
            (left, right) =>
              new Date(right.insertedAt ?? 0).getTime() -
              new Date(left.insertedAt ?? 0).getTime()
          ),
        ] as const
    )
}

function displaySavedPromptTitle(title: string) {
  return title === 'Default' ? 'Saved prompt' : title
}

function displaySavedPromptCategory(category: string) {
  return category === 'Default' ? 'General' : category
}

const InputWrapperSC = styled.div({
  position: 'relative',
  width: '100%',
})
