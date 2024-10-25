import { useAiQuery } from '../../generated/graphql.ts'
import AIPanel from './AIPanel.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'

export default function ExplainWithAIPanel({
  prompt,
  open,
  onClose,
}: {
  prompt: string
  open: boolean
  onClose: () => void
}) {
  const { data, loading, error } = useAiQuery({ variables: { prompt } })

  return (
    <AIPanel
      open={open}
      onClose={onClose}
      showCloseIcon
      header={'AI explain'}
      subheader={'Learn more about the current page with AI'}
    >
      <div>{data?.ai}</div>
      {loading && <LoadingIndicator></LoadingIndicator>}
      {error && <div>{error.message}</div>}
    </AIPanel>
  )
}
