import { ReactElement, ReactNode, cloneElement } from 'react'

type WrapWithIfProps = {
  condition: boolean
  wrapper: ReactElement<{ children?: never }>
  children: ReactNode
}
function WrapWithIf({ condition, wrapper, children }: WrapWithIfProps) {
  if (condition) {
    return cloneElement(wrapper, {}, children)
  }

  // Typescript won't allow unwrapped children as return value
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}

export default WrapWithIf
