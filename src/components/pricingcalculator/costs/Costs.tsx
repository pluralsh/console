import { ReactElement } from 'react'
import styled from 'styled-components'

type CostsWrapProps = {
  marginTop?: number
}

const CostsWrap = styled.div<CostsWrapProps>(({ theme, marginTop }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  marginTop,

  '.header': {
    ...theme.partials.text.overline,
    color: theme.colors.text,
  },
}))

export type CostsProps = {
  header?: string
  marginTop?: number
  children: ReactElement | ReactElement[] | string
}

export default function Costs({
  header,
  marginTop,
  children,
}: CostsProps) {
  return (
    <CostsWrap marginTop={marginTop}>
      {header && <div className="header">{header}</div>}
      {children}
    </CostsWrap>
  )
}
