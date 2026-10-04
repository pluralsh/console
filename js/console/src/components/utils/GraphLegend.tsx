import type { CSSProperties } from 'react'
import styled from 'styled-components'

export type GraphLegendItem = {
  id: string
  label: string
  color: string
  /** Full label shown on hover when `label` is abbreviated. */
  title?: string
  dashed?: boolean
}

/** Series legend shared by all timeseries charts: line swatches, small muted labels. */
export function GraphLegend({
  items,
  selectedId,
  onSelect,
  maxHeight,
  style,
  className,
}: {
  items: GraphLegendItem[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  maxHeight?: number
  style?: CSSProperties
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <WrapperSC
      className={className}
      style={{
        ...(maxHeight != null && { maxHeight, overflowY: 'auto' }),
        ...style,
      }}
    >
      {items.map(({ id, label, title, color, dashed }) => (
        <ItemSC
          key={id}
          type="button"
          title={title ?? label}
          disabled={!onSelect}
          aria-pressed={onSelect ? selectedId === id : undefined}
          onClick={() => onSelect?.(id)}
          $interactive={!!onSelect}
          $dimmed={!!selectedId && selectedId !== id}
        >
          <svg
            aria-hidden
            height={12}
            width={12}
            css={{ flex: '0 0 12px' }}
          >
            <line
              x1={0}
              x2={12}
              y1={6}
              y2={6}
              stroke={color}
              strokeDasharray={dashed ? '4 3' : undefined}
              strokeWidth={2}
            />
          </svg>
          <span css={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
        </ItemSC>
      ))}
    </WrapperSC>
  )
}

const WrapperSC = styled.div({
  alignContent: 'flex-start',
  display: 'flex',
  flexShrink: 0,
  flexWrap: 'wrap',
  gap: '4px 10px',
})

const ItemSC = styled.button<{ $interactive: boolean; $dimmed: boolean }>(
  ({ theme, $interactive, $dimmed }) => ({
    ...theme.partials.reset.button,
    alignItems: 'center',
    borderRadius: 4,
    color: theme.colors['text-xlight'],
    cursor: $interactive ? 'pointer' : 'default',
    display: 'flex',
    fontSize: 12,
    gap: 6,
    lineHeight: '16px',
    maxWidth: '100%',
    minWidth: 0,
    opacity: $dimmed ? 0.45 : 1,
    padding: '2px 4px',
    textAlign: 'left',
    ...($interactive && {
      '&:hover': {
        background: 'rgba(0, 0, 0, .03)',
        color: theme.colors['text-light'],
      },
      '&:focus-visible': {
        outline: `1px solid ${theme.colors['border-outline-focused']}`,
        outlineOffset: 1,
      },
    }),
  })
)
