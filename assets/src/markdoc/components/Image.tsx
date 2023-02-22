import styled from 'styled-components'

import { FigCaption } from './Figure'
import { MediaWrap } from './MediaWrap'

export const commonCfg = { shouldForwardProp: () => true }

const StyledImg = styled.img.withConfig(commonCfg)(({ theme }) => ({
  display: 'block',
  maxWidth: '100%',
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  overflow: 'hidden',
  marginLeft: 'auto',
  marginRight: 'auto',
}))

function Image({ title, bareImage, ...props }) {
  if (bareImage) {
    return <StyledImg {...props} />
  }

  return (
    <MediaWrap as="figure">
      <StyledImg {...props} />
      {title && <FigCaption>{title}</FigCaption>}
    </MediaWrap>
  )
}

export default Image
