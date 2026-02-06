import { Chip, ChipProps } from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import { useEffect } from 'react'
import styled from 'styled-components'

export function SimpleToastChip({
  show,
  onClose,
  delayTimeout = 5000,
  ...props
}: { show: boolean; delayTimeout?: number | 'none' } & ChipProps) {
  const transitions = useTransition(show ? [true] : [], {
    from: { transform: 'translateX(-50%) translateY(100%)' },
    enter: { transform: 'translateX(-50%) translateY(0)' },
    leave: { transform: 'translateX(-50%) translateY(0)' },
    config: { tension: 300, friction: 20 },
    expires: 0,
  })

  useEffect(() => {
    if (!show || delayTimeout === 'none') return
    const timeoutId = setTimeout(() => onClose?.(), delayTimeout)
    return () => clearTimeout(timeoutId)
  }, [show, delayTimeout, onClose])

  if (!open || !show) return null

  return transitions((style) => (
    <AnimatedWrapperSC style={style}>
      <ChipSC
        fillLevel={3}
        size="large"
        {...props}
      />
    </AnimatedWrapperSC>
  ))
}

const AnimatedWrapperSC = styled(animated.div)(({ theme }) => ({
  position: 'fixed',
  left: '50%',
  bottom: 40,
  zIndex: theme.zIndexes.toast,
}))

const ChipSC = styled(Chip)(({ theme }) => ({
  borderRadius: 100,
  boxShadow: theme.boxShadows.moderate,
  '.children': {
    ...theme.partials.text.body2,
  },
}))
