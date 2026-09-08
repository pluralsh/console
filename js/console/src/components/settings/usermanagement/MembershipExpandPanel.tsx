import {
  AppIcon,
  Button,
  CaretRightIcon,
  Flex,
  Spinner,
} from '@pluralsh/design-system'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { Children, ReactNode, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

export const MEMBERSHIP_VISIBLE_ROWS = 5
export const MEMBERSHIP_ROW_HEIGHT = 68
export const MEMBERSHIP_FETCH_LIMIT = 30
export const MEMBERSHIP_LIST_MAX_HEIGHT =
  MEMBERSHIP_VISIBLE_ROWS * MEMBERSHIP_ROW_HEIGHT

export const ColMembershipExpander = {
  id: 'expander',
  header: () => {},
  meta: { gridTemplate: '48px' },
  cell: ({ row }) =>
    row.getCanExpand() && (
      <CaretRightIcon
        size={12}
        color="icon-light"
        cursor="pointer"
        style={{
          alignSelf: 'center',
          transform: `rotate(${row.getIsExpanded() ? 90 : 0}deg)`,
          transition: 'transform .2s',
        }}
        onClick={(e) => {
          e.stopPropagation()
          row.getToggleExpandedHandler()()
        }}
      />
    ),
}

export function MembershipExpandPanel({
  copyText,
  getCopyText,
  copyDisabled,
  loading,
  emptyMessage,
  viewAll,
  children,
}: {
  copyText?: string
  getCopyText?: () => Promise<string>
  copyDisabled?: boolean
  loading?: boolean
  emptyMessage?: string
  viewAll?: { onClick: () => void }
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const showEmpty = !loading && Children.count(children) === 0

  useEffect(() => {
    if (!copied) return

    const timeout = setTimeout(() => setCopied(false), 1000)

    return () => clearTimeout(timeout)
  }, [copied])

  const handleCopy = useCallback(async () => {
    setCopying(true)
    try {
      const text = getCopyText ? await getCopyText() : (copyText ?? '')
      await window.navigator.clipboard.writeText(text)
      setCopied(true)
    } finally {
      setCopying(false)
    }
  }, [copyText, getCopyText])

  return (
    <WrapperSC onClick={(e) => e.stopPropagation()}>
      <BodySC>
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
            <MembershipListRowSC>
              <CaptionP $color="text-xlight">{emptyMessage}</CaptionP>
            </MembershipListRowSC>
          )}
          {children}
        </ListSC>
        {viewAll && (
          <SeeFullListSC
            type="button"
            onClick={viewAll.onClick}
          >
            See full list
          </SeeFullListSC>
        )}
      </BodySC>
      <Button
        small
        secondary
        disabled={copyDisabled || copying || (!getCopyText && !copyText)}
        onClick={handleCopy}
        width="fit-content"
      >
        {copied ? 'Copied' : 'Copy list'}
      </Button>
    </WrapperSC>
  )
}

export function MembershipUserRow({
  name,
  email,
  avatar,
}: {
  name?: string | null
  email?: string | null
  avatar?: string | null
}) {
  return (
    <MembershipListRowSC>
      <IdentitySC>
        <AppIcon
          url={avatar ?? undefined}
          name={name ?? undefined}
          spacing={avatar ? 'none' : undefined}
          size="xsmall"
        />
        <Body2P
          $color="text-light"
          css={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Body2P>
      </IdentitySC>
      {email && (
        <CaptionP
          $color="text-xlight"
          css={{ flexShrink: 0 }}
        >
          {email}
        </CaptionP>
      )}
    </MembershipListRowSC>
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
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  minHeight: MEMBERSHIP_ROW_HEIGHT,
  padding: `${theme.spacing.medium}px ${theme.spacing.medium}px ${theme.spacing.medium}px ${theme.spacing.small}px`,
  backgroundColor: theme.colors['fill-zero'],
  borderBottom: theme.borders.default,
  '&:nth-child(even)': {
    backgroundColor: theme.colors['fill-zero-selected'],
  },
  '&:last-child': { borderBottom: 'none' },
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  backgroundColor: theme.colors['fill-zero'],
}))

const BodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  flex: 1,
  minWidth: 0,
}))

const ListSC = styled.div(({ theme }) => ({
  maxHeight: MEMBERSHIP_LIST_MAX_HEIGHT,
  overflow: 'auto',
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.large,
}))

const IdentitySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
  flex: 1,
  overflow: 'hidden',
}))

const SeeFullListSC = styled.button(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  width: 'fit-content',
  '&:hover': { color: theme.colors['text-light'] },
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
