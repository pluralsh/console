import {
  AddIcon,
  BookmarkAddIcon,
  Flex,
  IconFrame,
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
import capitalize from 'lodash/capitalize'
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
import type { SavedPromptCreateRouteState } from './prompts/SavedPromptForm'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'
import { CaptionP } from 'components/utils/typography/Text'

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
                <WorkbenchSavedPrompts
                  workbenchId={workbenchId}
                  disabled={loading}
                  currentPrompt={prompt}
                  onSelectPrompt={handleSelectSavedPrompt}
                />
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

const SAVED_PROMPTS_PANEL_WIDTH = 460

function WorkbenchSavedPrompts({
  workbenchId,
  disabled,
  currentPrompt,
  onSelectPrompt,
}: {
  workbenchId: string
  disabled: boolean
  currentPrompt: string
  onSelectPrompt: (prompt: string) => void
}) {
  const navigate = useNavigate()
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)

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

  return (
    <Select
      transparent
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      selectedKey=""
      label="Saved prompts"
      width={SAVED_PROMPTS_PANEL_WIDTH}
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
        <IconFrame
          type="tertiary"
          clickable={!disabled}
          icon={<BookmarkAddIcon size={12} />}
          disabled={disabled}
          tooltip="Saved prompts"
        />
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
            const trimmedPrompt = currentPrompt.trim()
            navigate(getWorkbenchSavedPromptCreateAbsPath(workbenchId), {
              state: trimmedPrompt
                ? ({
                    prompt: trimmedPrompt,
                  } satisfies SavedPromptCreateRouteState)
                : undefined,
            })
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
            const prompt = savedPrompt.prompt ?? ''

            return (
              <Tooltip
                key={savedPrompt.id}
                textValue={title}
                referenceRole={false}
                placement="right"
                offset={theme.spacing.medium}
                style={{
                  width: SAVED_PROMPTS_PANEL_WIDTH,
                  boxSizing: 'border-box',
                  padding: theme.spacing.medium,
                  pointerEvents: 'none',
                }}
                label={
                  <Flex
                    direction="column"
                    gap="small"
                    width="100%"
                  >
                    <div
                      css={{
                        ...theme.partials.text.body2,
                        color: theme.colors.text,
                      }}
                    >
                      {title}
                    </div>
                    <SavedPromptTooltipPromptSC>
                      <WorkbenchStoredPromptMarkdown
                        text={prompt}
                        density="jobCard"
                        clampLines={5}
                        promptColor="text-xlight"
                      />
                    </SavedPromptTooltipPromptSC>
                    <CaptionP css={{ color: theme.colors['text-xlight'] }}>
                      Category: {capitalize(category)}
                    </CaptionP>
                  </Flex>
                }
              >
                <ListBoxItem
                  label={title}
                  description={
                    <WorkbenchStoredPromptMarkdown
                      text={prompt}
                      density="jobCard"
                      clampLines={1}
                      promptColor="text-xlight"
                    />
                  }
                  textValue={title}
                  css={{
                    width: '100%',
                    '.center-content': {
                      flex: 1,
                      minWidth: 0,
                      width: 'auto',
                      maxWidth: '100%',
                    },
                    '.description': {
                      minWidth: 0,
                      overflow: 'hidden',
                    },
                  }}
                />
              </Tooltip>
            )
          }),
        ])
      )}
    </Select>
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

const SavedPromptTooltipPromptSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-three'],
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.small,
  minWidth: 0,
  overflow: 'hidden',
}))
