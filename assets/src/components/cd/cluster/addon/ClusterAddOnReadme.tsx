import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import MarkdocComponent from '../../../utils/MarkdocContent'

import { useClusterAddOnContext } from './ClusterAddOnDetails'

export default function ClusterAddOnReadme() {
  const { runtimeService } = useClusterAddOnContext()

  return (
    <ScrollablePage heading="Readme">
      <MarkdocComponent raw={runtimeService?.addon?.readme} />
    </ScrollablePage>
  )
}
