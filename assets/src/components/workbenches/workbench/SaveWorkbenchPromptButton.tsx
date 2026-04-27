import {
  BookmarkFilledIcon,
  BookmarkIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  useCreateWorkbenchPromptMutation,
  useDeleteWorkbenchPromptMutation,
  useWorkbenchPromptsSuspenseQuery,
} from 'generated/graphql'
import { Suspense, useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

import type { ComponentProps } from 'react'

type SaveWorkbenchPromptButtonProps = {
  workbenchId: string
  prompt: string
} & Omit<ComponentProps<typeof IconFrame>, 'icon' | 'clickable' | 'onClick'>

export function SaveWorkbenchPromptButton({
  prompt,
  ...props
}: SaveWorkbenchPromptButtonProps) {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) return null
  return (
    <Suspense fallback={null}>
      <SaveWorkbenchPromptButtonInner
        prompt={trimmedPrompt}
        {...props}
      />
    </Suspense>
  )
}

function SaveWorkbenchPromptButtonInner({
  prompt,
  workbenchId,
  ...props
}: SaveWorkbenchPromptButtonProps) {
  const { popToast } = useSimpleToast()

  const { data } = useWorkbenchPromptsSuspenseQuery({
    variables: { id: workbenchId },
    skip: !workbenchId || !prompt,
    fetchPolicy: 'cache-and-network',
  })

  const savedPromptId = useMemo(
    () =>
      mapExistingNodes(data?.workbench?.prompts).find(
        (p) => p.prompt?.trim() === prompt
      )?.id,
    [data, prompt]
  )

  const isSaved = !!savedPromptId

  const [savePrompt, { loading: saveLoading }] =
    useCreateWorkbenchPromptMutation({
      variables: { workbenchId, attributes: { prompt } },
      refetchQueries: ['WorkbenchPrompts'],
      awaitRefetchQueries: true,
      onCompleted: () => {
        popToast({ name: 'prompt', action: 'saved', severity: 'success' })
      },
      onError: () => {
        popToast({
          name: 'prompt',
          action: 'failed to save',
          severity: 'danger',
        })
      },
    })

  const [deletePrompt, { loading: deleteLoading }] =
    useDeleteWorkbenchPromptMutation({
      variables: { id: savedPromptId ?? '' },
      refetchQueries: ['WorkbenchPrompts'],
      awaitRefetchQueries: true,
      onCompleted: () => {
        popToast({ name: 'prompt', action: 'removed', severity: 'danger' })
      },
      onError: () => {
        popToast({
          name: 'prompt',
          action: 'failed to remove',
          severity: 'danger',
        })
      },
    })

  const loading = saveLoading || deleteLoading

  return (
    <IconFrame
      clickable={!loading}
      disabled={loading}
      tooltip={isSaved ? 'Remove saved prompt' : 'Save this prompt'}
      icon={
        isSaved || loading ? (
          <BookmarkFilledIcon
            color="icon-light"
            {...(loading && {
              css: {
                '@keyframes shimmer-bookmark-icon': {
                  '0%': { opacity: 0, transform: 'scale(1)' },
                  '50%': { opacity: 1, transform: 'scale(1.1)' },
                  '100%': { opacity: 0, transform: 'scale(1)' },
                },
                animation: 'shimmer-bookmark-icon 3s linear infinite',
              },
            })}
          />
        ) : (
          <BookmarkIcon color="icon-light" />
        )
      }
      onClick={() => {
        if (!prompt || !workbenchId || loading) return
        if (isSaved) deletePrompt()
        else savePrompt()
      }}
      {...props}
    />
  )
}
