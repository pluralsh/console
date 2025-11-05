import { useOutletContext } from 'react-router-dom'
import { InfraResearchContextType } from './InfraResearch'
import LoadingIndicator from 'components/utils/LoadingIndicator'

export function InfraResearchThreads() {
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  if (!infraResearch) return <LoadingIndicator />
  return <div>InfraResearchThreads</div>
}
