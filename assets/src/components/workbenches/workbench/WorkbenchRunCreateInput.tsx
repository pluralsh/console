import { ChatInputSimple } from 'components/ai/chatbot/input/ChatInput'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useCreateWorkbenchJobMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchRunAbsPath } from 'routes/workbenchesRoutesConsts'

const MAX_WIDTH = 924

export function WorkbenchRunCreateInput({
  workbenchId,
  workbenchLoading,
}: {
  workbenchId: string
  workbenchLoading: boolean
}) {
  const navigate = useNavigate()
  const inputRef = useAutofocusRef()
  const [prompt, setPrompt] = useState('')

  const [mutation, { loading, error }] = useCreateWorkbenchJobMutation({
    variables: { workbenchId, attributes: { prompt } },
    onCompleted: ({ createWorkbenchJob }) =>
      createWorkbenchJob?.id &&
      navigate(
        getWorkbenchRunAbsPath({ workbenchId, runId: createWorkbenchJob.id })
      ),
    refetchQueries: ['WorkbenchRuns'],
    awaitRefetchQueries: true,
  })

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
      <ChatInputSimple
        ref={inputRef}
        placeholder="What would you like to investigate?"
        setValue={setPrompt}
        onSubmit={mutation}
        loading={loading}
        allowSubmit={!!prompt}
        wrapperStyles={{ maxWidth: MAX_WIDTH }}
      />
    </>
  )
}
