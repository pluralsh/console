import { useOutletContext } from 'react-router-dom'
import { stringify } from 'yaml'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { RawPageCode } from '../../../cluster/RawPageCode'
import { Node } from '../../../../generated/graphql'

export default function NodeRaw() {
  const { node } = useOutletContext() as { node: Node }

  if (!node) return <LoadingIndicator />

  let content

  try {
    content = stringify(JSON.parse(node.raw), { indent: 2 })
  } catch {
    content = node.raw
  }

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
