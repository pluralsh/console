import {
  Button,
  EmptyState,
  Flex,
  FormField,
  Input,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useCreateWorkbenchPromptMutation,
  useUpdateWorkbenchPromptMutation,
  useWorkbenchPromptsQuery,
  useWorkbenchQuery,
  WorkbenchPromptFragment,
} from 'generated/graphql'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchSavedPromptsAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_SAVED_PROMPT_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'

type SavedPromptFormState = {
  prompt: string
}

export function SavedPromptForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const savedPromptId = useParams()[WORKBENCHES_SAVED_PROMPT_PARAM_ID]
  const [formState, setFormState] = useState<SavedPromptFormState>(
    getInitialFormState()
  )
  const { popToast } = useSimpleToast()

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const {
    data: promptsData,
    loading: promptsLoading,
    error: promptsError,
  } = useWorkbenchPromptsQuery({
    variables: {
      id: workbenchId,
      first: 500,
    },
    skip: mode !== 'edit' || !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const prompts = useMemo(
    () => mapExistingNodes(promptsData?.workbench?.prompts),
    [promptsData]
  )
  const savedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === savedPromptId) ?? null,
    [prompts, savedPromptId]
  )

  useEffect(() => {
    if (!savedPrompt) return
    setFormState(getInitialFormState(savedPrompt))
  }, [savedPrompt])

  const prompt = formState.prompt.trim()
  const attributes = { prompt }

  const canSave =
    !!prompt && !isEqual(formState, getInitialFormState(savedPrompt))

  const handleCompleted = () => {
    navigate(getWorkbenchSavedPromptsAbsPath(workbenchId))
    popToast({
      name: 'prompt',
      action: savedPrompt ? 'updated' : 'created',
      color: 'icon-success',
    })
  }

  const [createWorkbenchPrompt, createState] = useCreateWorkbenchPromptMutation(
    {
      variables: { workbenchId, attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchPrompts'],
      awaitRefetchQueries: true,
    }
  )

  const [updateWorkbenchPrompt, updateState] = useUpdateWorkbenchPromptMutation(
    {
      variables: { id: savedPrompt?.id ?? '', attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchPrompts'],
      awaitRefetchQueries: true,
    }
  )

  const isSaving = createState.loading || updateState.loading
  const mutationError = createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (savedPrompt) updateWorkbenchPrompt()
    else createWorkbenchPrompt()
  }

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'saved prompts',
          url: getWorkbenchSavedPromptsAbsPath(workbenchId),
        },
        { label: mode === 'create' ? 'create' : 'edit' },
      ],
      [mode, workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  if (promptsError) return <GqlError error={promptsError} />

  if (mode === 'edit' && !promptsLoading && !savedPrompt)
    return (
      <EmptyState message="Saved prompt not found">
        <Button
          startIcon={<ReturnIcon />}
          onClick={() => navigate(getWorkbenchSavedPromptsAbsPath(workbenchId))}
        >
          Back to all saved prompts
        </Button>
      </EmptyState>
    )

  const isLoading =
    (!workbenchData && workbenchLoading) ||
    (mode === 'edit' && !promptsData && promptsLoading)

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <StackedText
        loading={!workbenchData && workbenchLoading}
        first={workbench?.name}
        firstPartialType="subtitle2"
        firstColor="text"
        second={workbench?.description}
        secondPartialType="body2"
        secondColor="text-xlight"
        gap="xxsmall"
      />
      <Flex
        direction="column"
        width="100%"
        css={{ maxWidth: 750 }}
      >
        {isLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height={300}
          />
        ) : (
          <FormCardSC>
            {mutationError && <GqlError error={mutationError} />}
            <Flex
              direction="column"
              gap="large"
              height="100%"
              width="100%"
            >
              <FormField
                required
                infoTooltip="The instruction your Workbench agent will use when this saved prompt is selected."
                label="Prompt"
              >
                <Input
                  multiline
                  minRows={3}
                  maxRows={6}
                  value={formState.prompt}
                  onChange={(e) => {
                    const nextPrompt = e.target.value

                    setFormState((prev) => ({ ...prev, prompt: nextPrompt }))
                  }}
                  placeholder="Ask the agent use an integrated tool or service on your cluster"
                />
              </FormField>
              <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
                <Button
                  secondary
                  startIcon={<ReturnIcon />}
                  onClick={() =>
                    navigate(getWorkbenchSavedPromptsAbsPath(workbenchId))
                  }
                  disabled={isSaving}
                >
                  Back to all saved prompts
                </Button>
                <Button
                  onClick={() => handleSave()}
                  loading={isSaving}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </StickyActionsFooterSC>
            </Flex>
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}

function getInitialFormState(
  savedPrompt?: Nullable<WorkbenchPromptFragment>
): SavedPromptFormState {
  return {
    prompt: savedPrompt?.prompt ?? '',
  }
}
