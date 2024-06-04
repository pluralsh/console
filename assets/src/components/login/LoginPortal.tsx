import { Div, Flex } from 'honorable'

import { Footer, FooterBalancer } from './LoginFooter'
import { RIGHT_CONTENT_MAX_WIDTH, RIGHT_CONTENT_PAD } from './constants'

export function LoginPortal({ children }: any) {
  return (
    <Flex
      height="100vh"
      overflow="auto"
      flexDirection="column"
      grow={1}
      shrink={1}
      paddingHorizontal={RIGHT_CONTENT_PAD}
    >
      <FooterBalancer />
      <Div
        maxWidth={RIGHT_CONTENT_MAX_WIDTH}
        width="100%"
        marginVertical="auto"
        marginHorizontal="auto"
      >
        {children}
      </Div>
      <Footer />
    </Flex>
  )
}
