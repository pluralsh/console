import { IconFrame } from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import styled, { useTheme } from 'styled-components'

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
      <ColorSwatchSC $color={color} />
      <Body1BoldP as="span">{value}</Body1BoldP>
      <Body2P
        $color="text-xlight"
        css={{ flex: 1 }}
      >
        {name} {nameSuffix}
      </Body2P>
      <IconFrame
        size="small"
        icon={<RadioButtonSVG checked={selected} />}
      />
    </CardSC>
  )
}

const CardSC = styled.button<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    borderRadius: theme.borderRadiuses.large,
    border: theme.borders.input,
    background: 'transparent',
    whiteSpace: 'nowrap',
    ...($selected && { background: theme.colors['fill-zero-selected'] }),
    '&:hover': { background: theme.colors['fill-zero-hover'] },
    '&:focus-visible': { border: theme.borders['outline-focused'] },
    flex: 1,
    minWidth: '33%',
    '&, & svg *': { transition: 'all 0.16s ease-in-out' },
  })
)

const ColorSwatchSC = styled.div<{ $color: string }>(({ $color, theme }) => ({
  height: 18,
  width: 18,
  flexShrink: 0,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: $color,
}))

function RadioButtonSVG({ checked }: { checked: boolean }) {
  const { colors } = useTheme()
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="10"
        height="10"
        rx="5"
        fill={checked ? colors['fill-primary'] : 'transparent'}
      />
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="15"
        rx="7.5"
        stroke={checked ? colors['border-selected'] : colors['border-input']}
      />
    </svg>
  )
}
