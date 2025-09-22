import { ComponentProps, ReactNode, memo } from 'react'
import styled, { DefaultTheme } from 'styled-components'

import { SemanticColorKey } from '@pluralsh/design-system'
import { TRUNCATE } from '../truncate'
import { RectangleSkeleton } from '../SkeletonLoaders'

type PartialType = keyof DefaultTheme['partials']['text']
type SpacingType = keyof DefaultTheme['spacing']

export const StackedTextSC = styled.div<{
  $truncate?: boolean
  $gap?: SpacingType
}>(({ $truncate, $gap, theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  ...($gap ? { gap: theme.spacing[$gap] } : {}),
  ...($truncate ? TRUNCATE : {}),
}))
const FirstSC = styled.div<{
  $truncate?: boolean
  $partialType?: PartialType
  $color?: SemanticColorKey
}>(
  ({
    theme,
    $truncate,
    $partialType = 'body2LooseLineHeight',
    $color = 'text-light',
  }) => ({
    ...theme.partials.text[$partialType],
    ...($truncate ? TRUNCATE : {}),
    color: theme.colors[$color],
  })
)
const SecondSC = styled.div<{
  $truncate?: boolean
  $partialType?: PartialType
  $color?: SemanticColorKey
}>(
  ({ theme, $truncate, $partialType = 'caption', $color = 'text-xlight' }) => ({
    ...theme.partials.text[$partialType],
    color: theme.colors[$color],
    ...($truncate ? TRUNCATE : {}),
  })
)

export const StackedText = memo(
  ({
    first,
    second,
    truncate,
    firstPartialType,
    secondPartialType,
    firstColor,
    secondColor,
    gap,
    loading = false,
    ...props
  }: {
    first: ReactNode
    second?: ReactNode
    truncate?: boolean
    firstPartialType?: PartialType
    secondPartialType?: PartialType
    firstColor?: SemanticColorKey
    secondColor?: SemanticColorKey
    gap?: SpacingType
    loading?: boolean
  } & ComponentProps<typeof StackedTextSC>) => (
    <StackedTextSC
      $truncate={truncate}
      $gap={loading ? 'xxsmall' : gap}
      {...props}
    >
      <FirstSC
        $partialType={firstPartialType}
        $truncate={truncate}
        $color={firstColor}
      >
        {loading ? <RectangleSkeleton /> : first}
      </FirstSC>
      {second && (
        <SecondSC
          $truncate={truncate}
          $partialType={secondPartialType}
          $color={secondColor}
        >
          {loading ? <RectangleSkeleton /> : second}
        </SecondSC>
      )}
    </StackedTextSC>
  )
)
