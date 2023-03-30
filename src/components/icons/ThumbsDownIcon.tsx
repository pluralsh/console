import styled from 'styled-components'

import ThumbsUpIcon from './ThumbsUpIcon'

export default styled(ThumbsUpIcon)((_) => ({
  svg: {
    transform: 'rotate(180deg)',
  },
}))
