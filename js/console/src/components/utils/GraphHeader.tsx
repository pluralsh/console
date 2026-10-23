import { InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import type { ReactNode } from 'react'
import styled from 'styled-components'

/**
 * One-line graph header shared by built-in and workbench dashboards: a left-aligned title, its
 * description behind an info icon, and optional actions on the right.
 */
export default function GraphHeader({
  title,
  tooltip,
  actions,
}: {
  title: string
  tooltip?: Nullable<string>
  actions?: ReactNode
}) {
  return (
    <WrapperSC>
      <TitleSC title={title}>{title}</TitleSC>
      {!!tooltip && (
        <Tooltip
          label={tooltip}
          placement="top"
        >
          <InfoIconSC
            size={14}
            color="icon-xlight"
            aria-label={tooltip}
          />
        </Tooltip>
      )}
      {actions && <ActionsSC>{actions}</ActionsSC>}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minHeight: 24,
  minWidth: 0,
  width: '100%',
}))

const TitleSC = styled.h3(({ theme }) => ({
  ...theme.partials.text.body1,
  ...TRUNCATE,
  color: theme.colors.text,
  margin: 0,
  minWidth: 0,
}))

const InfoIconSC = styled(InfoOutlineIcon)({
  flexShrink: 0,
})

const ActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,
  marginLeft: 'auto',
}))
