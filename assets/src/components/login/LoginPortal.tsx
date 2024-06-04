import { Footer, FooterBalancer } from './LoginFooter'
import { RIGHT_CONTENT_MAX_WIDTH, RIGHT_CONTENT_PAD } from './constants'

export function LoginPortal({ children }: any) {
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1,
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
  )
}
