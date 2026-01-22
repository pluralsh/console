import { GqlError } from 'components/utils/Alert'
import { useCreateInfraResearchMutation } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInfraResearchAbsPath } from 'routes/aiRoutesConsts'
import { ChatInputSimple } from '../chatbot/input/ChatInput'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'

export function InfraResearchInput() {
  const navigate = useNavigate()
  const inputRef = useAutofocusRef()
  const [prompt, setPrompt] = useState('')

  const [mutation, { loading, error }] = useCreateInfraResearchMutation({
    variables: { attributes: { prompt } },
    onCompleted: ({ createInfraResearch }) =>
      createInfraResearch?.id &&
      navigate(
        getInfraResearchAbsPath({ infraResearchId: createInfraResearch.id })
      ),
    refetchQueries: ['InfraResearches'],
    awaitRefetchQueries: true,
  })

  return (
    <>
      {error && <GqlError error={error} />}
      <ChatInputSimple
        ref={inputRef}
        placeholder="What do you want to investigate? (e.g. “Show me the architecture of the Grafana deployment”)"
        setValue={setPrompt}
        onSubmit={mutation}
        loading={loading}
        allowSubmit={!!prompt}
      />
    </>
  )
}
