import {
  Button,
  ButtonProps,
  Div,
  DivProps,
  FlexProps,
  H1,
  H1Props,
  H2,
  Section,
} from 'honorable'
import { ReactNode, forwardRef } from 'react'

export type SidecarProps = {
  heading?: ReactNode
  headingProps?: H1Props
  contentProps?: DivProps
} & FlexProps

const Sidecar = forwardRef<HTMLElement, SidecarProps>(
  ({ heading, headingProps, children, ...props }, ref) => (
    <Section
      ref={ref}
      border="1px solid border"
      borderRadius="medium"
      padding="medium"
      {...props}
    >
      {heading && (
        <H1
          overline
          color="text-xlight"
          marginBottom="medium"
          {...headingProps}
        >
          {heading}
        </H1>
      )}
      {children}
    </Section>
  )
)

const SidecarItem = forwardRef<HTMLDivElement, SidecarProps>(
  ({ heading, headingProps, contentProps, children, ...props }, ref) => (
    <Div
      ref={ref}
      marginBottom="large"
      _last={{ marginBottom: 0 }}
      {...props}
    >
      {heading && (
        <H2
          caption
          color="text-xlight"
          marginBottom="xxsmall"
          {...headingProps}
        >
          {heading}
        </H2>
      )}
      {children && (
        <Div
          body
          overflowWrap="anywhere"
          {...contentProps}
        >
          {children}
        </Div>
      )}
    </Div>
  )
)

const SidecarButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ ...props }, ref) => (
    <Button
      ref={ref}
      tertiary
      padding="none"
      width="100%"
      {...props}
    />
  )
)

export default Sidecar
export { SidecarItem, SidecarButton }
