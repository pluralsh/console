import { Div, type DivProps } from 'honorable'
import { type ComponentProps, type ReactNode } from 'react'
import styled, { type DefaultTheme } from 'styled-components'

import {
  type FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import WrapWithIf from './WrapWithIf'
import { lightElevatedSurface } from '../theme/lightElevatedSurface'
import { borderWidths } from '../theme/borders'

type CornerSize = 'medium' | 'large'
type CardFillLevel = Exclude<FillLevel, 0>

type BaseCardProps = {
  /** Used to override a fill level set by `FillLevelContext`  */
  fillLevel?: FillLevel
  cornerSize?: CornerSize
  clickable?: boolean
  disabled?: boolean
  selected?: boolean
  header?: {
    size?: 'medium' | 'large'
    content?: ReactNode
    headerProps?: ComponentProps<'div'>
    outerProps?: ComponentProps<'div'>
  }
  tabs?: ReactNode
  tabsOuterProps?: ComponentProps<'div'>
}

type CardProps = DivProps & BaseCardProps

export const fillToNeutralBgC = {
  0: 'fill-one',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

export const fillToNeutralBorderC = {
  0: 'border',
  1: 'border',
  2: 'border-fill-two',
  3: 'border-fill-three',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const fillToNeutralHoverBgC = {
  0: 'fill-one-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
  3: 'fill-three-hover',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const fillToNeutralSelectedBgC = {
  0: 'fill-one-selected',
  1: 'fill-one-selected',
  2: 'fill-two-selected',
  3: 'fill-three-selected',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

export function useDecideFillLevel({ fillLevel }: { fillLevel?: number }) {
  const parentFillLevel = useFillLevel()

  return (
    typeof fillLevel === 'number'
      ? toFillLevel(Math.max(1, fillLevel))
      : toFillLevel(parentFillLevel + 1)
  ) as CardFillLevel
}

const HeaderSC = styled.div<{
  $fillLevel: CardFillLevel
  $selected: boolean
  $size: 'medium' | 'large'
  $cornerSize: CornerSize
}>(
  ({
    theme,
    $fillLevel: fillLevel,
    $selected: selected,
    $size: size,
    $cornerSize: cornerSize,
  }) => ({
    ...theme.partials.text.overline,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    color: theme.colors['text-xlight'],
    border: `1px solid ${theme.colors[fillToNeutralBorderC[fillLevel]]}`,
    borderBottom: 'none',
    borderRadius: `${theme.borderRadiuses[cornerSize]}px ${theme.borderRadiuses[cornerSize]}px 0 0`,
    backgroundColor:
      theme.colors[
        selected
          ? fillToNeutralSelectedBgC[fillLevel]
          : fillToNeutralBgC[fillLevel]
      ],
    height: size === 'large' ? 48 : 40,
    padding: `0 ${theme.spacing.medium}px`,
    // overflow:hidden + matching radius shears the 1px border at corners
    // and can make the white fill look clipped against the border curve.
    overflow: theme.mode === 'light' ? 'visible' : 'hidden',
    ...(theme.mode === 'light' && { backgroundClip: 'padding-box' }),
  })
)

const CardSC = styled(Div)<{
  $hasHeader: boolean
  $hasTabs: boolean
  $fillLevel: CardFillLevel
  $cornerSize: CornerSize
  $selected: boolean
  $clickable: boolean
  $disabled: boolean
  $overflowSpecified: boolean
}>(
  ({
    theme,
    $hasHeader,
    $hasTabs,
    $fillLevel: fillLevel,
    $cornerSize: cornerSize,
    $selected: selected,
    $clickable: clickable,
    $disabled: disabled,
    $overflowSpecified,
  }) => ({
    ...theme.partials.reset.button,
    border: `1px solid ${
      theme.colors[
        fillToNeutralBorderC[
          $hasHeader ? toFillLevel(fillLevel + 1) : fillLevel
        ]
      ]
    }`,
    borderRadius: $hasHeader
      ? `0 0 ${theme.borderRadiuses[cornerSize]}px ${theme.borderRadiuses[cornerSize]}px`
      : theme.borderRadiuses[cornerSize],
    // Soft lift on the body when there's no header wrapper; header cards
    // elevate via OuterWrapSC so the full card (header + body) casts one shadow.
    ...(!$hasHeader ? lightElevatedSurface(theme) : null),
    // Soft box-shadow paints outside the border box; hidden clips it flush.
    // Skip when the caller set overflow so scrollable cards (e.g. stack logs)
    // can still clip and scroll.
    ...(theme.mode === 'light' &&
      !$overflowSpecified && { overflow: 'visible' }),
    // Keep opaque fill inset from the border curve (outer radius − border width)
    ...(theme.mode === 'light' && {
      backgroundClip: 'padding-box',
    }),
    ...($hasTabs && {
      borderTopLeftRadius: 0, // TODO: It should be applied only if first tab is active.
    }),
    backgroundColor:
      theme.colors[
        selected
          ? fillToNeutralSelectedBgC[fillLevel]
          : fillToNeutralBgC[fillLevel]
      ],
    '&:focus, &:focus-visible': {
      outline: 'none',
    },
    '&:focus-visible': {
      borderColor: theme.colors['border-outline-focused'],
    },
    ...(clickable &&
      !disabled && {
        cursor: 'pointer',
      }),
    ...(clickable &&
      !disabled &&
      !selected && {
        '&:hover': {
          backgroundColor: theme.colors[fillToNeutralHoverBgC[fillLevel]],
        },
      }),
    ...theme.partials.scrollBar({ fillLevel }),
  })
)

const OuterWrapSC = styled.div<{
  $overflowVisible: boolean
  $cornerSize: CornerSize
}>(({ theme, $overflowVisible: overflowVisible, $cornerSize: cornerSize }) => {
  const outerRadius = theme.borderRadiuses[cornerSize]
  // Inner white/header pieces use outerRadius; shadow host uses outer+border
  // so the curve isn’t flush with the opaque fill (reads as a hard clip).
  const shadowRadius = outerRadius + borderWidths.default

  return {
    display: 'flex',
    flexDirection: 'column',
    // Light mode cards use box-shadow; overflow:hidden clips it on all sides.
    overflow: overflowVisible || theme.mode === 'light' ? 'visible' : 'hidden',
    width: '100%',
    height: '100%',
    ...(theme.mode === 'light' && {
      borderRadius: shadowRadius,
      boxShadow: theme.boxShadows.slight,
    }),
  }
})

function Card({
  ref,
  header,
  tabs,
  tabsOuterProps,
  cornerSize = 'large',
  fillLevel,
  selected = false,
  clickable = false,
  disabled = false,
  children,
  overflow,
  overflowX,
  overflowY,
  ...props
}: CardProps) {
  const hasHeader = !!header
  const hasTabs = !!tabs
  const { size, content: headerContent, headerProps, outerProps } = header ?? {}
  const overflowSpecified =
    overflow != null || overflowX != null || overflowY != null

  const mainFillLevel = useDecideFillLevel({ fillLevel })
  const headerFillLevel = useDecideFillLevel({ fillLevel: mainFillLevel + 1 })

  return (
    <FillLevelProvider value={mainFillLevel}>
      <WrapWithIf
        condition={hasHeader || hasTabs}
        wrapper={
          <OuterWrapSC
            $overflowVisible={hasTabs}
            $cornerSize={cornerSize}
            {...(hasTabs ? tabsOuterProps : outerProps)}
          />
        }
      >
        {hasTabs && tabs}
        {hasHeader && (
          <HeaderSC
            $fillLevel={headerFillLevel}
            $selected={selected}
            $size={size ?? 'medium'}
            $cornerSize={cornerSize}
            {...headerProps}
          >
            {headerContent}
          </HeaderSC>
        )}
        <CardSC
          ref={ref}
          $cornerSize={cornerSize}
          $fillLevel={mainFillLevel}
          $selected={selected}
          $clickable={clickable}
          $hasHeader={hasHeader}
          $hasTabs={hasTabs}
          {...(clickable && {
            forwardedAs: 'button',
            type: 'button',
            'data-clickable': 'true',
          })}
          $disabled={clickable && disabled}
          $overflowSpecified={overflowSpecified}
          overflow={overflow}
          overflowX={overflowX}
          overflowY={overflowY}
          {...props}
        >
          {children}
        </CardSC>
      </WrapWithIf>
    </FillLevelProvider>
  )
}

export default Card
export type { BaseCardProps, CardFillLevel, CardProps, CornerSize }
