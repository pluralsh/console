import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Fragment, ReactNode, useEffect, useRef } from 'react'
import styled from 'styled-components'

export type DevboxSuggestion = {
  key: string
  title: string
  subtitle?: Nullable<string>
  icon?: ReactNode
  kind?: string
  group?: string
  mono?: boolean
}

export function DevboxSuggestionMenu({
  label,
  items,
  active,
  loading = false,
  empty = 'No matches',
  onPick,
  onHover,
}: {
  label: string
  items: DevboxSuggestion[]
  active: number
  loading?: boolean
  empty?: string
  onPick: (index: number) => void
  onHover: (index: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  return (
    <MenuSC
      ref={listRef}
      role="listbox"
      aria-label={label}
    >
      {items.length === 0 ? (
        <EmptySC>
          {loading ? (
            <RectangleSkeleton
              $width="100%"
              $height="xlarge"
            />
          ) : (
            empty
          )}
        </EmptySC>
      ) : (
        items.map((item, idx) => (
          <Fragment key={item.key}>
            {item.group && item.group !== items[idx - 1]?.group && (
              <GroupSC aria-hidden>{item.group}</GroupSC>
            )}
            <RowSC
              role="option"
              aria-selected={idx === active}
              $active={idx === active}
              onMouseEnter={() => onHover(idx)}
              // mousedown fires before the textarea loses focus
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(idx)
              }}
            >
              {item.icon && <IconSC>{item.icon}</IconSC>}
              <TextSC>
                {item.mono ? (
                  <TitleCodeSC>{item.title}</TitleCodeSC>
                ) : (
                  <TitleSC>{item.title}</TitleSC>
                )}
                {item.subtitle && <SubtitleSC>{item.subtitle}</SubtitleSC>}
              </TextSC>
              {item.kind && <KindSC>{item.kind}</KindSC>}
            </RowSC>
          </Fragment>
        ))
      )}
    </MenuSC>
  )
}

const MenuSC = styled.div(({ theme }) => ({
  position: 'absolute',
  left: 0,
  bottom: `calc(100% + ${theme.spacing.xsmall})`,
  width: 'min(420px, 100%)',
  maxHeight: 320,
  overflowY: 'auto',
  zIndex: theme.zIndexes.selectPopover,
  padding: theme.spacing.xxsmall,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-one'],
  boxShadow: theme.boxShadows.modal,
}))

const GroupSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.xsmall} ${theme.spacing.small} ${theme.spacing.xxsmall}`,
}))

const RowSC = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.xsmall} ${theme.spacing.small}`,
  borderRadius: theme.borderRadiuses.medium,
  cursor: 'pointer',
  background: $active ? theme.colors['fill-two'] : 'transparent',
}))

const IconSC = styled.span(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  color: theme.colors['icon-light'],
}))

const TextSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const TitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  ...ellipsis,
  fontWeight: 600,
  color: theme.colors.text,
}))

const TitleCodeSC = styled.code(({ theme }) => ({
  ...theme.partials.text.caption,
  ...theme.partials.text.mono,
  ...ellipsis,
  color: theme.colors.text,
}))

const SubtitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  ...ellipsis,
  color: theme.colors['text-xlight'],
}))

const KindSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flexShrink: 0,
  color: theme.colors['text-xlight'],
  textTransform: 'uppercase',
  letterSpacing: 0.4,
}))

const EmptySC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
  textAlign: 'center',
}))
