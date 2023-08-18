import { Button, CaretUpIcon } from '@pluralsh/design-system'
import styled from 'styled-components'

const ReturnToBeginningSC = styled.div(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing.xlarge,
  right: theme.spacing.medium,
  zIndex: 1,
  opacity: 0,
  transition: '0.2s opacity ease',
  '*:hover > &': {
    opacity: 1,
  },
}))

export function ReturnToBeginning({ beginning }: any) {
  return (
    <ReturnToBeginningSC>
      <Button
        floating
        onClick={beginning}
        endIcon={<CaretUpIcon size={14} />}
        pointerEvents="auto"
      >
        Back to top
      </Button>
    </ReturnToBeginningSC>
  )
}
