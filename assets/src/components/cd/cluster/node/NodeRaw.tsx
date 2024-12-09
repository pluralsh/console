import { useOutletContext } from 'react-router-dom'
import { stringify } from 'yaml'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { Node } from '../../../../generated/graphql'
import { RawPageCode } from '../../../utils/RawPageCode.tsx'

export default function NodeRaw() {
  const { node } = useOutletContext() as { node: Node }

  if (!node) return <LoadingIndicator />

  const content = stringify(JSON.parse(node.raw))

  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
    >
      <RawPageCode>{content}</RawPageCode>
    </Flex>
  )
}
