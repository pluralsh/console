import { H1 } from 'honorable'

export function WelcomeHeader({
  heading = 'Welcome to Plural Console',
  textAlign = 'center',
  ...props
}: any) {
  return (
    <div css={props}>
      <H1
        title1
        textAlign={textAlign}
      >
        {heading}
      </H1>
    </div>
  )
}
