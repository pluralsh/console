import type { CSSProperties } from 'react'
import styled from 'styled-components'

import { TRUNCATE } from './truncate'

export type GraphLegendItem = {
  id: string
  label: string
  color: string
  /** Full label shown on hover when `label` is abbreviated. */
  title?: string
  dashed?: boolean
}

/**
 * `wrap` flows every item onto as many lines as needed, `row` keeps a single
 * truncated line, and `column` lists one item per line.
 */
export type GraphLegendLayout = 'wrap' | 'row' | 'column'

/** Series legend shared by all timeseries charts: line swatches, small muted labels. */
export function GraphLegend({
  items,
  selectedId,
  onSelect,
  maxHeight,
  layout = 'wrap',
  style,
  className,
}: {
  items: GraphLegendItem[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  maxHeight?: number
  layout?: GraphLegendLayout
  style?: CSSProperties
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <WrapperSC
      $layout={layout}
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
          $layout={layout}
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
          <LabelSC $layout={layout}>{label}</LabelSC>
        </ItemSC>
      ))}
    </WrapperSC>
  )
}

const WrapperSC = styled.div<{ $layout: GraphLegendLayout }>(({ $layout }) => ({
  alignContent: 'flex-start',
  display: 'flex',
  flexShrink: 0,
  gap: '0.25rem 0.625rem',
  ...($layout === 'wrap' && { flexWrap: 'wrap' }),
  ...($layout === 'column' && { flexDirection: 'column' }),
  ...($layout === 'row' && {
    overflow: 'hidden',
    maskImage:
      'linear-gradient(to right, black calc(100% - 24px), transparent)',
  }),
}))

const LabelSC = styled.span<{ $layout: GraphLegendLayout }>(({ $layout }) =>
  $layout === 'wrap'
    ? { minWidth: 0, overflowWrap: 'anywhere' }
    : { ...TRUNCATE, minWidth: 0 }
)

// a single row clips overflowing items rather than squeezing them all
const ROW_ITEM_MAX_WIDTH = 220

const ItemSC = styled.button<{
  $interactive: boolean
  $dimmed: boolean
  $layout: GraphLegendLayout
}>(({ theme, $interactive, $dimmed, $layout }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  borderRadius: 4,
  color: theme.colors['text-xlight'],
  cursor: $interactive ? 'pointer' : 'default',
  display: 'flex',
  fontSize: '0.75rem',
  gap: '0.375rem',
  lineHeight: '1rem',
  maxWidth: $layout === 'row' ? ROW_ITEM_MAX_WIDTH : '100%',
  minWidth: 0,
  ...($layout === 'row' && { flexShrink: 0 }),
  opacity: $dimmed ? 0.45 : 1,
  padding: '0.125rem 0.25rem',
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
}))
