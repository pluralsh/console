import { useOutletContext } from 'react-router-dom'

import { Markdown } from '@pluralsh/design-system'
import { ScrollablePage } from '../../../utils/layout/ScrollablePage'
import { ClusterAddOnOutletContextT } from '../ClusterAddon.tsx'

export default function ClusterAddOnReadme() {
  const { addOn } = useOutletContext<ClusterAddOnOutletContextT>()

  return (
    <ScrollablePage>
      <Markdown text={addOn?.addon?.readme || 'No readme found'} />
    </ScrollablePage>
  )
}
