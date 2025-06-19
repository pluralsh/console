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
}

type CardProps = DivProps & BaseCardProps

const fillToNeutralBgC = {
  0: 'fill-one',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
} as const satisfies Record<FillLevel, keyof DefaultTheme['colors']>

const fillToNeutralBorderC = {
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
    overflow: 'hidden',
  })
)

const CardSC = styled(Div)<{
  $hasHeader: boolean
  $fillLevel: CardFillLevel
  $cornerSize: CornerSize
  $selected: boolean
  $clickable: boolean
  $disabled: boolean
}>(
  ({
    theme,
    $hasHeader,
    $fillLevel: fillLevel,
    $cornerSize: cornerSize,
    $selected: selected,
    $clickable: clickable,
    $disabled: disabled,
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

const OuterWrapSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  width: '100%',
  height: '100%',
})

function Card({
  ref,
  header,
  cornerSize = 'large',
  fillLevel,
  selected = false,
  clickable = false,
  disabled = false,
  children,
  ...props
}: CardProps) {
  const hasHeader = !!header
  const { size, content: headerContent, headerProps, outerProps } = header ?? {}

  const mainFillLevel = useDecideFillLevel({ fillLevel })
  const headerFillLevel = useDecideFillLevel({ fillLevel: mainFillLevel + 1 })

  return (
    <FillLevelProvider value={mainFillLevel}>
      <WrapWithIf
        condition={hasHeader}
        wrapper={<OuterWrapSC {...outerProps} />}
      >
        {header && (
          <HeaderSC
            $fillLevel={headerFillLevel}
            $selected={selected}
            $size={size}
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
          {...(clickable && {
            forwardedAs: 'button',
            type: 'button',
            'data-clickable': 'true',
          })}
          $disabled={clickable && disabled}
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
