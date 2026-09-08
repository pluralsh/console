import { Card, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { truncate } from 'lodash'

import { useState } from 'react'
import styled from 'styled-components'

export function JsonExpanderCard({
  json,
  maxLength = 50,
  stringifySpace = 2,
}: {
  json: any
  maxLength?: number
  stringifySpace?: number
}) {
  const str = JSON.stringify(json, null, stringifySpace)
  const [truncated, setTruncated] = useState(true)
  return (
    <WrapWithIf
      condition={truncated}
      wrapper={
        <Tooltip
          placement="top"
          label={truncated ? 'Expand' : 'Collapse'}
        />
      }
    >
      <WrapperCardSC
        $truncated={truncated}
        clickable
        onClick={() => setTruncated(!truncated)}
      >
        {truncated ? truncate(str, { length: maxLength }) : str}
      </WrapperCardSC>
    </WrapWithIf>
  )
}

const WrapperCardSC = styled(Card)<{ $truncated: boolean }>(
  ({ theme, $truncated }) => ({
    ...theme.partials.text.body2,
    padding: theme.spacing.small,
    whiteSpace: $truncated ? 'normal' : 'pre-wrap',
  })
)
