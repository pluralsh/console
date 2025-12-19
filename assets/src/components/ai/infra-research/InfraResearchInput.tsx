import { GqlError } from 'components/utils/Alert'
import { useCreateInfraResearchMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AI_THREADS_REL_PATH } from 'routes/aiRoutesConsts'
import { ChatInputSimple } from '../chatbot/input/ChatInput'

export function InfraResearchInput() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')

  const [mutation, { loading, error }] = useCreateInfraResearchMutation({
    variables: { attributes: { prompt } },
    onCompleted: ({ createInfraResearch }) =>
      createInfraResearch?.id &&
      navigate(`${createInfraResearch.id}/${AI_THREADS_REL_PATH}`),
    refetchQueries: ['InfraResearches'],
    awaitRefetchQueries: true,
  })

  return (
    <>
      {error && <GqlError error={error} />}
      <ChatInputSimple
        ref={(node) => node?.focus()}
        placeholder="What do you want to investigate? (e.g. “Show me the architecture of the Grafana deployment”)"
        setValue={setPrompt}
        onSubmit={mutation}
        loading={loading}
        allowSubmit={!!prompt}
      />
    </>
  )
}
