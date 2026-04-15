import { SemanticColorKey } from '@pluralsh/design-system'
import { ComponentPropsWithRef, ReactNode } from 'react'
import styled, { DefaultTheme } from 'styled-components'

type TextProps = {
  $color?: SemanticColorKey
  $shimmer?: boolean
}

export const Body1P = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.body1,
  ...sharedTextStyles(props),
}))
export const Body2P = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.body2,
  ...sharedTextStyles(props),
}))
export const Body1BoldP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.body1Bold,
  ...sharedTextStyles(props),
}))
export const Body2BoldP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.body2Bold,
  ...sharedTextStyles(props),
}))
export const CaptionP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.caption,
  ...sharedTextStyles(props),
}))
export const ButtonSmallP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.buttonSmall,
  ...sharedTextStyles(props),
}))
export const ButtonMediumP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.buttonMedium,
  ...sharedTextStyles(props),
}))
export const BadgeLabelP = styled.p<TextProps>((props) => ({
  ...props.theme.partials.text.badgeLabel,
  ...sharedTextStyles(props),
}))
export const StrongSC = styled.strong<TextProps>((props) => ({
  ...sharedTextStyles(props),
}))
export const SpanSC = styled.span<TextProps>((props) => ({
  ...sharedTextStyles(props),
}))
export const OverlineH1 = styled.h1<TextProps>((props) => ({
  ...props.theme.partials.text.overline,
  ...sharedTextStyles(props),
}))
export const OverlineH3 = styled.h3<TextProps>((props) => ({
  ...props.theme.partials.text.overline,
  ...sharedTextStyles(props),
}))
export const Subtitle1H1 = styled.h2<TextProps>((props) => ({
  ...props.theme.partials.text.subtitle1,
  ...sharedTextStyles(props),
}))
export const Subtitle2H1 = styled.h3<TextProps>((props) => ({
  ...props.theme.partials.text.subtitle2,
  ...sharedTextStyles(props),
}))
export const Title1H1 = styled.h1<TextProps>((props) => ({
  ...props.theme.partials.text.title1,
  ...sharedTextStyles(props),
}))
export const Title2H1 = styled.h1<TextProps>((props) => ({
  ...props.theme.partials.text.title2,
  ...sharedTextStyles(props),
}))

const StandardUrlSC = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))
export function InlineA({
  href,
  children,
  ...props
}: {
  href: Nullable<string>
  children?: ReactNode
} & Omit<ComponentPropsWithRef<typeof StandardUrlSC>, 'children' | 'href'>) {
  return (
    <StandardUrlSC
      href={href || ''}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </StandardUrlSC>
  )
}

// how wide the bright band is
const SHIMMER_SPREAD = '5%'
// how long one full sweep takes
const SHIMMER_DURATION = '1.75s'

const sharedTextStyles = ({
  theme,
  $color,
  $shimmer,
}: { theme: DefaultTheme } & TextProps) => ({
  color: $color && theme.colors[$color],
  ...($shimmer && {
    '@keyframes shimmer-text': {
      '0%': { backgroundPosition: '100% center' },
      '100%': { backgroundPosition: '0% center' },
    },
    backgroundImage: `linear-gradient(90deg, #0000 calc(50% - ${SHIMMER_SPREAD}), ${theme.colors['text-light']}, #0000 calc(50% + ${SHIMMER_SPREAD})), linear-gradient(${theme.colors['text-xlight']}, ${theme.colors['text-xlight']})`,
    backgroundSize: '250% 100%, auto',
    backgroundRepeat: 'no-repeat, padding-box',
    backgroundClip: 'text',
    color: 'transparent',
    animation: `shimmer-text ${SHIMMER_DURATION} linear infinite`,
  }),
})
