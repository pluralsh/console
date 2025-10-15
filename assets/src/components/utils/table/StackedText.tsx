import { ComponentProps, ReactNode, memo } from 'react'
import styled, { DefaultTheme } from 'styled-components'

import { Flex, SemanticColorKey, WrapWithIf } from '@pluralsh/design-system'
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
    icon,
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
    icon?: ReactNode
  } & ComponentProps<typeof StackedTextSC>) => (
    <WrapWithIf
      condition={!!icon}
      wrapper={<IconWrapper icon={icon} />}
    >
      <StackedTextSC
        $truncate={truncate}
        $gap={loading ? 'xsmall' : gap}
        {...props}
      >
        <FirstSC
          $partialType={firstPartialType}
          $truncate={truncate}
          $color={firstColor}
        >
          {loading ? <RectangleSkeleton /> : first}
        </FirstSC>
        {(second || loading) && (
          <SecondSC
            $truncate={truncate}
            $partialType={secondPartialType}
            $color={secondColor}
          >
            {loading ? <RectangleSkeleton /> : second}
          </SecondSC>
        )}
      </StackedTextSC>
    </WrapWithIf>
  )
)

function IconWrapper({
  icon,
  children,
}: {
  icon: ReactNode
  children?: ReactNode
}) {
  return (
    <Flex
      gap="small"
      align="center"
    >
      {icon}
      {children}
    </Flex>
  )
}
