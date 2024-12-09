import { useOutletContext } from 'react-router-dom'
import { stringify } from 'yaml'
import { Pod } from 'generated/graphql'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { RawPageCode } from '../../../utils/RawPageCode.tsx'

// It's used by multiple routes.
export default function PodRaw() {
  const { pod } = useOutletContext() as { pod: Pod }
  const content = stringify(JSON.parse(pod.raw))

  return (
    <ScrollablePage
      scrollable={false}
      heading="Raw"
    >
      <RawPageCode>{content}</RawPageCode>
    </ScrollablePage>
  )
}
