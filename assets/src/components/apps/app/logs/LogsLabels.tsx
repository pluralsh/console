import { Chip, Tooltip } from '@pluralsh/design-system'
import { Div, Flex, Span } from 'honorable'
import { truncate } from 'lodash'

const MAX_LENGTH = 4

function LogsLabelChip({ name, value, removeLabel }) {
  return (
    <Chip
      clickable
      closeButton
      onClick={() => removeLabel(name)}
    >
      <Span>{name}:</Span>
      <Span fontWeight={400}>{truncate(value, { length: MAX_LENGTH })}</Span>
    </Chip>
  )
}

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
      {labels.map(({ name, value }) => (
        <>
          {value.length > MAX_LENGTH && (
            <Tooltip label={value}>
              <Div>
                <LogsLabelChip
                  name={name}
                  value={value}
                  removeLabel={removeLabel}
                />
              </Div>
            </Tooltip>
          )}
          {value.length <= MAX_LENGTH && (
            <LogsLabelChip
              name={name}
              value={value}
              removeLabel={removeLabel}
            />
          )}
        </>
      ))}
    </Flex>
  )
}
