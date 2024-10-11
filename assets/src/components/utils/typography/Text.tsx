import styled from 'styled-components'
import { DefaultTheme } from 'styled-components/dist/types'

type TextProps = {
  $color?: keyof DefaultTheme['colors']
}

export const Body1P = styled.p<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.body1,
  color: $color && (theme.colors[$color] as string),
}))
export const Body2P = styled.p<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.body2,
  color: $color && (theme.colors[$color] as string),
}))
export const Body1BoldP = styled.p<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.body1Bold,
  color: $color && (theme.colors[$color] as string),
}))
export const Body2BoldP = styled.p<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.body2Bold,
  color: $color && (theme.colors[$color] as string),
}))
export const CaptionP = styled.p<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.caption,
  color: $color && (theme.colors[$color] as string),
}))
export const OverlineH1 = styled.h1<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.overline,
  color: $color && (theme.colors[$color] as string),
}))
export const Subtitle1H1 = styled.h1<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.subtitle1,
  color: $color && (theme.colors[$color] as string),
}))
export const Subtitle2H1 = styled.h1<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.subtitle2,
  color: $color && (theme.colors[$color] as string),
}))
export const Title1H1 = styled.h1<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.title1,
  color: $color && (theme.colors[$color] as string),
}))
export const Title2H1 = styled.h1<TextProps>(({ theme, $color }) => ({
  ...theme.partials.text.title2,
  color: $color && (theme.colors[$color] as string),
}))
export const A = styled.a``
export const TabularNums = styled.span({
  fontVariantNumeric: 'tabular-nums',
})
