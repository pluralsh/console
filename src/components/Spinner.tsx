import { Spinner as HonorableSpinner } from 'honorable'
import { type ComponentProps } from 'react'
import styled from 'styled-components'

const SpinnerSC = styled(HonorableSpinner)<{ $color: string }>(
  ({ $color }) => ({
    '&&::before': {
      borderTopColor: $color || 'red',
    },
  })
)

export function Spinner({
  color,
  as,
  ...props
}: { color: string } & ComponentProps<typeof SpinnerSC>) {
  return (
    <SpinnerSC
      $color={color}
      {...(as ? { forwardedAs: as } : {})}
      {...props}
    />
  )
}
