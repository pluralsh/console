import styled from 'styled-components'

export const commonCfg = { shouldForwardProp: () => true }

export const MdBlockquote = styled.blockquote.withConfig(commonCfg)(({ theme }) => ({
  position: 'relative',
  ...theme.partials.text.body1,
  color: theme.colors['text-light'],
  margin: 0,
  marginLeft: theme.spacing.xlarge - 1,
  borderLeft: `2px solid ${theme.colors.border}`,
  padding: '0',
  paddingLeft: theme.spacing.xlarge - 1,
  boxShadow: 'none',
  '& p': {
    ...theme.partials.text.body1,
    color: theme.colors['text-light'],
  },
}))
export const MdUl = styled.ul.withConfig(commonCfg)(({ theme }) => ({
  paddingLeft: theme.spacing.xlarge,
  marginBottom: theme.spacing.small,
}))
export const MdOl = styled.ol.withConfig(commonCfg)(({ theme }) => ({
  paddingLeft: theme.spacing.xlarge,
  marginBottom: theme.spacing.small,
}))
export const MdLi = styled.li.withConfig(commonCfg)(({ theme }) => ({
  ...theme.partials.text.body2,
  marginTop: theme.spacing.xxsmall,
}))
export const MdImg = styled.img(() => ({ display: 'inline', maxWidth: '100%' }))
export const MdP = styled.p.withConfig(commonCfg)(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  marginBottom: theme.spacing.medium,
}))
export const MdDiv = styled.div.withConfig(commonCfg)(({ theme }) => ({
  ...theme.partials.text.body2,
  marginBottom: theme.spacing.medium,
}))
export const MdA = styled.a.withConfig(commonCfg)(({ theme }) => ({
  display: 'inline',
  ...theme.partials.text.inlineLink,
}))
export const MdSpan = styled.span.withConfig(commonCfg)(_p => ({
  verticalAlign: 'bottom',
}))
export const MdCode = styled.code.withConfig(commonCfg)(({ theme }) => ({
  fontFamily: theme.fontFamilies.mono,
  display: 'inline',
  verticalAlign: 'baseline',
  padding: '0.1em 0.4em',
  margin: '-0.1em 0',
  backgroundColor: theme.colors['fill-one'],
  borderRadius: theme.borderRadiuses.medium,
}))
export const MdHr = styled.hr.withConfig(commonCfg)(({ theme }) => ({
  '&::before': {
    content: '""',
    display: 'table',
  },
  '&::after': {
    content: '""',
    clear: 'both',
    display: 'table',
  },
  height: '1px',
  backgroundColor: theme.colors.border,
  border: 0,
  padding: 0,
  margin: `${theme.spacing.xlarge}px ${theme.spacing.large}px`,
}))
