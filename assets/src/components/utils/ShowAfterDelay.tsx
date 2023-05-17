import {
  Children,
  ReactElement,
  ReactNode,
  cloneElement,
  useEffect,
  useState,
} from 'react'
import styled from 'styled-components'

function ShowAfterDelayUnstyled({
  delay = 400,
  children,
  className,
}: {
  className?: string
  delay?: number
  children: ReactNode
}) {
  const [show, setShow] = useState(false)
  const [transitionIn, setTransitionIn] = useState(false)
  const child: ReactElement<any> = Children.only(children) as ReactElement
  const clone = child
    ? cloneElement(child, {
        className: `${className}${transitionIn ? ' transitionIn' : ''}`,
      })
    : null

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShow(true)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
    }
  })
  useEffect(() => {
    if (show) {
      setTransitionIn(true)
    }
  }, [show])

  return show ? clone : null
}

const ShowAfterDelay = styled(ShowAfterDelayUnstyled)((_) => ({
  opacity: 0,
  '&.transitionIn': {
    opacity: 1,
    transition: 'opacity 0.5s ease',
  },
}))

export default ShowAfterDelay
