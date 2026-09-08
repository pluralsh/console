import { InfoOutlineIcon, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import styled from 'styled-components'

export default function GraphHeader({
  title,
  tooltip,
}: {
  title: string
  tooltip?: string
}) {
  return (
    <WrapperSC>
      <WrapWithIf
        condition={!!tooltip}
        wrapper={<Tooltip label={tooltip} />}
      >
        <span>
          {title}
          {!!tooltip && (
            <InfoOutlineIcon
              size={14}
              css={{
                verticalAlign: 'text-top',
                marginLeft: '4px',
              }}
            />
          )}
        </span>
      </WrapWithIf>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-light'],
  textAlign: 'center',
}))
