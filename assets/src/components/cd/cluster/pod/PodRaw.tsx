import { useOutletContext } from 'react-router-dom'
import { stringify } from 'yaml'
import { Pod } from 'generated/graphql'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { RawPageCode } from '../../../cluster/RawPageCode'

export default function PodRaw() {
  const { pod } = useOutletContext() as { pod: Pod }

  if (!pod) return <LoadingIndicator />

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
