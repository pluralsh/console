import { useOutletContext } from 'react-router-dom'

import MarkdocComponent from '../../../utils/MarkdocContent'
import { ScrollablePage } from '../../../utils/layout/ScrollablePage'
import { ClusterAddOnOutletContextT } from '../ClusterAddon.tsx'

export default function ClusterAddOnReadme() {
  const { addOn } = useOutletContext<ClusterAddOnOutletContextT>()

  return (
    <ScrollablePage>
      <MarkdocComponent raw={addOn?.addon?.readme || 'No readme found'} />
    </ScrollablePage>
  )
}
