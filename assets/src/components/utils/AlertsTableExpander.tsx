import { Chip, Flex } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { AlertFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import styled from 'styled-components'
import { StackedText } from './table/StackedText'
import { Body2BoldP } from './typography/Text'

export function AlertsTableExpander({ row }: { row: Row<AlertFragment> }) {
  const alert = row.original
  const tags = alert.tags?.filter(
    (tag): tag is { id: string; name: string; value: string } => !!tag
  )
  const annotations = Object.entries(alert.annotations ?? {}).filter(
    (arr): arr is [string, string] => typeof arr[1] === 'string'
  )

  return (
    <WrapperSC>
      <StackedText
        first={alert.title}
        second={alert.message}
        firstPartialType="body2LooseLineHeightBold"
        firstColor="text"
        secondPartialType="body2"
      />
      <Flex gap="small">
        <ChipGroupLabelWrapperSC>
          <Body2BoldP $color="text">Annotations</Body2BoldP>
          <ChipListSC>
            {annotations?.map(([key, value]) => (
              <Chip
                tooltip={`${key}: ${value}`}
                key={key}
                size="small"
                severity="neutral"
              >
                {key}: {truncate(value)}
              </Chip>
            ))}
          </ChipListSC>
        </ChipGroupLabelWrapperSC>
        <ChipGroupLabelWrapperSC>
          <Body2BoldP $color="text">Tags</Body2BoldP>
          <ChipListSC>
            {tags?.map((tag) => (
              <Chip
                key={tag.id}
                size="small"
                severity="neutral"
              >
                {tag.name}: {tag.value}
              </Chip>
            ))}
          </ChipListSC>
        </ChipGroupLabelWrapperSC>
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing['xlarge'],
  maxWidth: 920,
}))

const ChipGroupLabelWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing['medium'],
  flex: 1,
}))

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing['xsmall'],
  flexWrap: 'wrap',
}))
