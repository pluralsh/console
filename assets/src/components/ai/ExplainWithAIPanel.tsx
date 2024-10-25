import { useAiCompletionQuery } from '../../generated/graphql.ts'
import AIPanel from './AIPanel.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { Markdown } from '@pluralsh/design-system'

const system = `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear explanation of your Kubernetes infrastructure. 
The user is not necessarily an expert in the domain, so please provide as much documentation
and evidence as is necessary to explain what issue they're facing if there is any.
You should give overview with detailed explanation that is easy to understand.`

export default function ExplainWithAIPanel({
  prompt,
  open,
  onClose,
}: {
  prompt: string
  open: boolean
  onClose: () => void
}) {
  const { data, loading, error } = useAiCompletionQuery({
    variables: { system, input: prompt },
  })

  return (
    <AIPanel
      open={open}
      onClose={onClose}
      showCloseIcon
      header={'AI explain'}
      subheader={'Learn more about the current page with AI'}
    >
      {data?.aiCompletion && <Markdown text={data.aiCompletion} />}
      {loading && <LoadingIndicator></LoadingIndicator>}
      {error && <div>{error.message}</div>}
    </AIPanel>
  )
}
