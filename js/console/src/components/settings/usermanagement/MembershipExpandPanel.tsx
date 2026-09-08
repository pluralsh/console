import {
  Button,
  CheckIcon,
  CopyIcon,
  Flex,
  Spinner,
  useCopyText,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { Children, ReactNode } from 'react'
import styled from 'styled-components'

export const MEMBERSHIP_VISIBLE_ROWS = 5
export const MEMBERSHIP_ROW_HEIGHT = 52
export const MEMBERSHIP_VIEW_ALL_AFTER = 30
export const MEMBERSHIP_LIST_MAX_HEIGHT =
  MEMBERSHIP_VISIBLE_ROWS * MEMBERSHIP_ROW_HEIGHT

export function MembershipExpandPanel({
  copyText,
  copyDisabled,
  loading,
  emptyMessage,
  viewAll,
  children,
}: {
  copyText: string
  copyDisabled?: boolean
  loading?: boolean
  emptyMessage?: string
  viewAll?: { label: string; onClick: () => void }
  children?: ReactNode
}) {
  const { copied, handleCopy } = useCopyText(copyText)
  const showEmpty = !loading && Children.count(children) === 0

  return (
    <WrapperSC onClick={(e) => e.stopPropagation()}>
      <Button
        small
        tertiary
        disabled={copyDisabled || !copyText}
        startIcon={copied ? <CheckIcon /> : <CopyIcon />}
        onClick={handleCopy}
        width="fit-content"
      >
        {copied ? 'Copied' : 'Copy list'}
      </Button>
      <ListSC>
        {loading && (
          <Flex
            justify="center"
            padding="medium"
          >
            <Spinner />
          </Flex>
        )}
        {showEmpty && emptyMessage && (
          <EmptySC>
            <CaptionP $color="text-xlight">{emptyMessage}</CaptionP>
          </EmptySC>
        )}
        {children}
        {viewAll && (
          <ViewAllSC>
            <Button
              small
              secondary
              onClick={viewAll.onClick}
            >
              {viewAll.label}
            </Button>
          </ViewAllSC>
        )}
      </ListSC>
    </WrapperSC>
  )
}

export function HoverActions({ children }: { children: ReactNode }) {
  return (
    <HoverActionsSC onClick={(e) => e.stopPropagation()}>
      {children}
    </HoverActionsSC>
  )
}

export const MembershipListRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: MEMBERSHIP_ROW_HEIGHT,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  borderBottom: theme.borders.default,
  '&:last-of-type': { borderBottom: 'none' },
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px 0`,
}))

const ListSC = styled.div({
  maxHeight: MEMBERSHIP_LIST_MAX_HEIGHT,
  overflowY: 'auto',
})

const EmptySC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.small}px`,
}))

const ViewAllSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: `${theme.spacing.small}px`,
}))

const HoverActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  opacity: 0,
  transition: 'opacity 0.12s ease',
  'tr:hover &, tr:focus-within &, &:focus-within': {
    opacity: 1,
  },
}))
