import { CloseIcon } from '@pluralsh/design-system'
import styled from 'styled-components'

const ClearFilterButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonSmall,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.input,
  cursor: 'pointer',
}))

export function LogsClearFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <ClearFilterButtonSC
      type="button"
      onClick={onClick}
    >
      <CloseIcon size={10} />
      Clear
    </ClearFilterButtonSC>
  )
}
