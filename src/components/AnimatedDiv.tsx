// Workaround for issue with styled components `css` prop and `animated.div`
// https://github.com/pmndrs/react-spring/issues/1515
import { animated } from 'react-spring'
import styled from 'styled-components'

export const AnimatedDiv = styled(animated.div)<any>``
