import { ResponsiveTreeMapCanvas, ResponsiveTreeMapHtml } from '@nivo/treemap'

import { ComponentPropsWithoutRef } from 'react'
import { styled, useTheme } from 'styled-components'
import { useGraphTheme } from './Graph'
import { isEmpty } from 'lodash'
import { EmptyState } from '@pluralsh/design-system'
import chroma from 'chroma-js'

export type TreeMapData = {
  name: string
  amount?: Nullable<number>
  children?: Nullable<TreeMapData[]>
}

export type TreeMapHtmlProps = Omit<
  ComponentPropsWithoutRef<typeof ResponsiveTreeMapHtml>,
  'data'
>
export type TreeMapCanvasProps = Omit<
  ComponentPropsWithoutRef<typeof ResponsiveTreeMapCanvas>,
  'data'
>

export type TreeMapProps = {
  data: TreeMapData
  loading?: boolean
  dataSize?: number
  type?: 'html' | 'canvas'
  colorScheme?: 'blue' | 'purple'
  emptyStateMessage?: string
  enableParentLabel?: boolean
} & (TreeMapHtmlProps | TreeMapCanvasProps)

const commonTreeMapProps = {
  identity: 'name',
  value: 'amount',
  label: (e) => e.id,
  labelSkipSize: 16,
  nodeOpacity: 0.9,
}

export const PARENT_NODE_NAME = 'overarching'

export function TreeMap({
  data,
  loading,
  type,
  dataSize,
  colorScheme = 'blue',
  emptyStateMessage = 'No data to display',
  enableParentLabel = true,
  ...props
}: TreeMapProps) {
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()
  const borderColor = chroma(colors['fill-one']).alpha(0.25).hex()
  if (isEmpty(data.children))
    return loading ? (
      <TreeMapSkeletonSC />
    ) : (
      <EmptyState message={emptyStateMessage} />
    )

  const derivedType =
    !dataSize || dataSize > 35 || type === 'canvas' ? 'canvas' : 'html'

  return (
    <WrapperSC
      $hasParentLabel={enableParentLabel}
      $outlineColor={borderColor}
    >
      {derivedType === 'canvas' ? (
        <ResponsiveTreeMapCanvas
          data={data}
          leavesOnly
          colors={colorScheme === 'blue' ? blueScheme : purpleScheme}
          theme={graphTheme}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          borderWidth={1}
          borderColor={borderColor}
          {...commonTreeMapProps}
          {...(props as TreeMapCanvasProps)}
        />
      ) : (
        <ResponsiveTreeMapHtml
          data={data}
          theme={graphTheme}
          colors={colorScheme === 'blue' ? blueScheme : purpleScheme}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          parentLabelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          borderWidth={0} // borders are handled by the wrapper below
          enableParentLabel={enableParentLabel}
          {...commonTreeMapProps}
          {...(props as TreeMapHtmlProps)}
        />
      )}
    </WrapperSC>
  )
}

// just used to override nivo styles when rendered in html
const WrapperSC = styled.div<{
  $hasParentLabel: boolean
  $outlineColor: string
}>(({ $hasParentLabel, $outlineColor }) => ({
  display: 'contents',
  // this targets all nodes, using outline instead of border so the border doesn't affect layout
  // if we used nivo's native border, it'll cause really small values to disappear and look like a gap
  [`& div[id^="${PARENT_NODE_NAME}"]`]: {
    outline: `1px solid ${$outlineColor}`,
  },

  // in cases where we want to show parent nodes (like separating clusters by project)
  // nivo doesn't seem to provide a way to hide the overarching wrapper label (or it's respective background)
  // this is a hacky solution to hide it and also maintain the chart's dimensions
  // PARENT_NODE_NAME is arbitrary, just needs to be consistent/unique
  [`&:has(div[id="${PARENT_NODE_NAME}"])`]: {
    '& > div': {
      transform: $hasParentLabel
        ? 'scale(1.02, 1.13) translateY(-12px)'
        : 'none',
    },
    // this targets only the top-level parent node
    [`& div[id="${PARENT_NODE_NAME}"]`]: { display: 'none' },
  },
}))

const TreeMapSkeletonSC = styled.div(({ theme }) => ({
  height: '100%',
  borderRadius: theme.borderRadiuses.large,
  background: 'linear-gradient(90deg, #2D3037 0%, #393C44 33%, #2D3037 66%)',
  backgroundSize: '300% 100%',
  animation: 'loading 1.8s linear infinite',
  '@keyframes loading': {
    '0%': { backgroundPosition: '200% 50%' },
    '100%': { backgroundPosition: '-100% 50%' },
  },
}))

const blueScheme = [
  '#d6f0ff',
  '#c2e9ff',
  '#ade1ff',
  '#99daff',
  '#66c7ff',
  '#4dbeff',
  '#33b4ff',
  '#0aa5ff',
]

const purpleScheme = [
  '#e2e3fd',
  '#cfd1fc',
  '#bcbffb',
  '#9fa3f9',
  '#747af6',
  '#5d63f4',
  '#4a51f2',
]
