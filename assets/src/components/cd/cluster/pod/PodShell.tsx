import { useOutletContext } from 'react-router-dom'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'

export default function PodShell() {
  const { pod } = useOutletContext() as { pod: Pod }

  return <ScrollablePage heading="Info">shell</ScrollablePage>
}
