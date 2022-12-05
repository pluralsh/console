import { Chip } from '@pluralsh/design-system'
import { Flex, Span } from 'honorable'
import { truncate } from 'lodash'

const MAX_LENGTH = 15

export default function LogsLabels({ labels, removeLabel }) {
  if (labels?.length < 1) return null

  return (
    <Flex
      direction="row"
      gap="xsmall"
      align="center"
      marginVertical="medium"
      wrap="wrap"
    >
      {labels.map(({ name, value }, i) => (
        <Chip
          clickable
          closeButton
          key={i}
          onClick={() => removeLabel(name)}
        >
          <Span>{name}:</Span>
          <Span fontWeight={400}>{truncate(value, { length: MAX_LENGTH })}</Span>
        </Chip>
      ))}
    </Flex>
  )
}
