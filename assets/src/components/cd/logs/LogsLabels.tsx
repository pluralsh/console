import { Chip, Flex, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { LogFacetInput } from 'generated/graphql'

import { isEmpty, truncate } from 'lodash'
import { Fragment } from 'react/jsx-runtime'

const MAX_LENGTH = 30

function LogsLabelChip({ name, value, removeLabel, ...props }) {
  return (
    <Chip
      clickable
      closeButton
      onClick={() => removeLabel(name)}
      {...props}
    >
      <Flex
        align="center"
        gap="xsmall"
      >
        <Body2BoldP>{name}:</Body2BoldP>
        <Body2P>{truncate(value, { length: MAX_LENGTH - name.length })}</Body2P>
      </Flex>
    </Chip>
  )
}

export function LogsLabels({
  labels,
  removeLabel,
}: {
  labels: LogFacetInput[]
  removeLabel: (key: string) => void
}) {
  if (isEmpty(labels)) return null

  return (
    <Flex
      direction="row"
      gap="xsmall"
      align="center"
      wrap="wrap"
    >
      {labels.map(({ key, value }) => (
        <Fragment key={key}>
          <WrapWithIf
            condition={key.length + value.length > MAX_LENGTH}
            wrapper={<Tooltip label={value} />}
          >
            <LogsLabelChip
              name={key}
              value={value}
              removeLabel={removeLabel}
            />
          </WrapWithIf>
        </Fragment>
      ))}
    </Flex>
  )
}
