import { useOutletContext } from 'react-router-dom'
import { stringify } from 'yaml'
import { Flex } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { RawPageCode } from '../../../cluster/RawPageCode'
import { Node } from '../../../../generated/graphql'

export default function NodeRaw() {
  const { node } = useOutletContext() as { node: Node }

  if (!node) return <LoadingIndicator />

  const { raw } = node

  const content = stringify(JSON.parse(raw))

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
