import { Flex } from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import styled from 'styled-components'

export function HomeFilterOptionCard<T extends string>({
  selected,
  onSelect,
  onDeselect,
  name,
  nameSuffix,
  value,
  color,
}: {
  selected: boolean
  onSelect: (name: T) => void
  onDeselect: () => void
  name: T
  nameSuffix?: string
  value: string | number
  color: string
}) {
  return (
    <CardSC
      onClick={() => (selected ? onDeselect() : onSelect(name))}
      $selected={selected}
    >
      <Flex
        gap="small"
        align="center"
      >
        <ColorSwatchSC $color={color} />
        <Body2BoldP as="span">{value}</Body2BoldP>
      </Flex>
      <CaptionP
        $color="text-xlight"
        css={{ flex: 1 }}
      >
        {name} {nameSuffix}
      </CaptionP>
    </CardSC>
  )
}

const CardSC = styled.button<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xxsmall,
    padding: theme.spacing.xsmall,
    borderRadius: theme.borderRadiuses.large,
    border: theme.borders['fill-two'],
    background: 'transparent',
    flex: 1,
    ...($selected && {
      background: theme.colors['fill-zero-selected'],
      borderColor: theme.colors['border-primary'],
    }),
    '&:hover': { background: theme.colors['fill-zero-hover'] },
    '&:focus-visible': { border: theme.borders['outline-focused'] },
    '&, & svg *': { transition: 'all 0.16s ease-in-out' },
  })
)

const ColorSwatchSC = styled.div<{ $color: string }>(({ $color, theme }) => ({
  height: 14,
  width: 14,
  flexShrink: 0,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: $color,
}))

export const HOME_CHARTS_COLORS = {
  green: '#17E8A0',
  blue: '#17DEE8',
  yellow: '#FFD346',
  orange: '#FD984A',
  red: '#EB5F7D',
  purple: '#747AF6',
}
