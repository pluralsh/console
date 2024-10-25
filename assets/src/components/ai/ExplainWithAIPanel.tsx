import { useAiCompletionQuery } from '../../generated/graphql.ts'
import AIPanel from './AIPanel.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { Markdown } from '@pluralsh/design-system'

const system = `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear summary of your companies Kubernetes infrastructure. 
The user is not necessarily an expert in the domain, so please provide as much documentation
and evidence as is necessary to explain what issue they're facing if there is any.
You should guide users to implement GitOps best practices,
so avoid telling them to manually modify resources via kubectl or helm commands directly,
although kubectl commands can be used for gathering further info to get better overview.`

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
