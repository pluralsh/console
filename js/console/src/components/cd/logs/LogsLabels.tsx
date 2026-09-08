import { Chip, Flex, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { LogFacetInput } from 'generated/graphql'

import { isEmpty, truncate } from 'lodash'
import { Fragment } from 'react/jsx-runtime'

const MAX_LENGTH = 30

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
      gap="xsmall"
      align="center"
      wrap="wrap"
    >
      {labels.map(({ key, value }) => (
        <Fragment key={key}>
          <WrapWithIf
            condition={key.length + value.length > MAX_LENGTH}
            wrapper={
              <Tooltip
                label={
                  <CaptionP>
                    <strong>key:</strong> {key}
                    <br /> <strong>value:</strong> {value}
                  </CaptionP>
                }
                placement="top"
              />
            }
          >
            <Chip
              clickable
              closeButton
              onClick={() => removeLabel(key)}
            >
              <Body2P $color="text-light">
                {key}: {truncate(value, { length: MAX_LENGTH - key.length })}
              </Body2P>
            </Chip>
          </WrapWithIf>
        </Fragment>
      ))}
    </Flex>
  )
}
