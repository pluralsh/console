import {
  AiSparkleFilledIcon,
  Button,
  Chip,
  Flex,
  Markdown,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { AlertFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
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
      {alert.insight && (
        <Button
          as={Link}
          to={`insight/${alert.insight.id}`}
          startIcon={<AiSparkleFilledIcon />}
          style={{ width: 'fit-content' }}
        >
          Go to insight
        </Button>
      )}

      <Body2BoldP $color="text">{alert.title}</Body2BoldP>
      <Flex
        direction="column"
        wordBreak="break-word"
      >
        <Markdown text={alert.message ?? ''} />
      </Flex>
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
  gap: theme.spacing.medium,
  maxWidth: 920,
}))

const ChipGroupLabelWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
}))

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing['xsmall'],
  flexWrap: 'wrap',
}))
