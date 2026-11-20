import styled from 'styled-components'

import { Footer, FooterBalancer } from './LoginFooter'
import { RIGHT_CONTENT_MAX_WIDTH, RIGHT_CONTENT_PAD } from './constants'
import { MobiusHero } from './MobiusHero'

// Below this width the hero is hidden and the form takes the whole screen
const HERO_BREAKPOINT = '@media screen and (max-width: 999px)'

export function LoginPortal({ children }: any) {
  return (
    <WrapperSC>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 440px',
          minWidth: 0,
          height: '100vh',
          overflow: 'auto',
          paddingLeft: RIGHT_CONTENT_PAD,
          paddingRight: RIGHT_CONTENT_PAD,
        }}
      >
        <FooterBalancer />
        <div
          css={{
            margin: 'auto',
            maxWidth: RIGHT_CONTENT_MAX_WIDTH,
            width: '100%',
          }}
        >
          {children}
        </div>
        <Footer />
      </div>
      <HeroWrapperSC>
        <MobiusHero />
      </HeroWrapperSC>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  height: '100vh',
  overflow: 'hidden',
  background: theme.colors['fill-zero'],
}))

const HeroWrapperSC = styled.div({
  display: 'flex',
  flex: '1.25 1 520px',
  minWidth: 0,
  [HERO_BREAKPOINT]: { display: 'none' },
})
