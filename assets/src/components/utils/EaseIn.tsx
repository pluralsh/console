import { SpringConfig, animated, useTransition } from '@react-spring/web'
import { Key } from '@react-types/shared'
import { ReactNode } from 'react'
import styled from 'styled-components'

export function EaseIn({
  children,
  currentKey,
  className,
  translateY = 8,
  config = { tension: 280, friction: 20 },
}: {
  children: ReactNode
  currentKey: Key
  className?: string
  translateY?: number
  config?: SpringConfig
}) {
  const transitions = useTransition([{ key: currentKey, child: children }], {
    keys: (item: { key: Key }) => item.key,
    from: { opacity: 0, transform: `translateY(${translateY}px)` },
    initial: { opacity: 1, transform: 'translateY(0px)' },
    enter: { opacity: 1, transform: 'translateY(0px)' },
    leave: { opacity: 0, transform: `translateY(-${translateY}px)` },
    config,
    expires: true,
  })

  return (
    <WrapperSC className={className}>
      {transitions((style, item) => (
        <AnimatedItemSC
          key={item.key}
          $isLeaving={item.key !== currentKey}
          style={style}
        >
          {item.child}
        </AnimatedItemSC>
      ))}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(() => ({
  minWidth: 0,
  overflow: 'hidden',
  position: 'relative' as const,
  width: '100%',
}))

const AnimatedItemSC = styled(animated.div)<{ $isLeaving: boolean }>(
  ({ $isLeaving }) => ({
    minWidth: 0,
    pointerEvents: $isLeaving ? 'none' : undefined,
    width: '100%',
    ...($isLeaving ? { inset: 0, position: 'absolute' as const } : {}),
  })
)
