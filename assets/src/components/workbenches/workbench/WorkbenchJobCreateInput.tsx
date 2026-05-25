import {
  ArrowTopRightIcon,
  BookmarkIcon,
  Chip,
  ChipProps,
  Flex,
  ListBoxItem,
  Select,
  WorkbenchIcon,
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
  useWorkbenchesQuery,
  useWorkbenchPromptsQuery,
  WorkbenchJobFragment,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import truncate from 'lodash/truncate'
import type { ComponentProps } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWorkbenchJobAbsPath,
  getWorkbenchSavedPromptsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { Body2P } from '../../utils/typography/Text.tsx'
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
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  useOutsideClick(wrapperRef, () => {
    if (open) setOpen(false)
  })

  return (
    <div ref={wrapperRef}>
      <ChatOptionPill
        isOpen={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <BookmarkIcon size={12} />
        <span>Saved prompts</span>
      </ChatOptionPill>
      <SavedPromptsOverlay
        open={open}
        workbenchId={workbenchId}
        onSelectPrompt={(p) => {
          setOpen(false)
          onSelectPrompt(p)
        }}
      />
    </div>
  )
}

function SavedPromptsOverlay({
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
    () => mapExistingNodes(data?.workbench?.prompts).reverse(),
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

  if (error) return null

  return transitions((styles) => (
    <AnimatedPromptsPanelSC
      style={{
        opacity: styles.opacity,
        maxHeight: styles.maxHeight,
        marginTop: styles.marginTop,
      }}
    >
      {noPrompts ? (
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
              label={prettifyPrompt(rowData.prompt ?? '')}
              fillLevel={2}
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
  ...props
}: {
  label: string
  fillLevel?: ComponentProps<typeof Chip>['fillLevel']
} & ChipProps) {
  return (
    <Chip
      size="large"
      fillLevel={fillLevel}
      clickable
      style={{ borderRadius: 16, width: 'fit-content' }}
      {...props}
    >
      {truncate(label, { length: 116 })}
    </Chip>
  )
}

const InputWrapperSC = styled.div({
  position: 'relative',
  width: '100%',
})

const AnimatedPromptsPanelSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: theme.zIndexes.modal + 1,
  boxSizing: 'border-box',
  overflow: 'hidden',
  backdropFilter: 'blur(4px)',
  border: `1px solid ${chroma(theme.colors['border-fill-two']).alpha(0.1).hex()}`,
  borderRadius: theme.borderRadiuses.large,
  padding: theme.spacing.medium,
  backgroundColor: chroma(theme.colors['fill-zero']).alpha(0.4).hex(),
  boxShadow: theme.boxShadows.modal,
}))
