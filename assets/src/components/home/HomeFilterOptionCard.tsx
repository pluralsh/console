import {
  Card,
  CheckOutlineIcon,
  CheckRoundedIcon,
  Flex,
} from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import styled from 'styled-components'

export function HomeFilterOptionCard<T extends string>({
  selected,
  onSelect,
  onDeselect,
  name,
  value,
  color,
}: {
  selected: boolean
  onSelect: (name: T) => void
  onDeselect: () => void
  name: T
  value: string | number
  color: string
}) {
  return (
    <CardSC
      clickable
      onClick={() => (selected ? onDeselect() : onSelect(name))}
      selected={selected}
    >
      <Flex
        width="100%"
        justifyContent="space-between"
      >
        <Body2P $color={selected ? 'text' : 'text-xlight'}>{name}</Body2P>
        {selected ? (
          <CheckRoundedIcon
            size={20}
            color="icon-primary"
          />
        ) : (
          <CheckOutlineIcon
            size={20}
            color="icon-xlight"
          />
        )}
      </Flex>
      <Flex gap="small">
        <ColorSwatchSC $color={color} />
        <Body2P>{value}</Body2P>
      </Flex>
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  opacity: selected ? 1 : 0.6,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  ...(!selected && {
    backgroundColor: 'transparent',
    '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  }),
  flex: 1,
  minWidth: '25%',
  [`@media (max-width: ${theme.breakpoints.desktopLarge}px)`]: {
    minWidth: '33%',
  },
}))

const ColorSwatchSC = styled.div<{ $color: string }>(({ $color }) => ({
  height: 20,
  width: 20,
  borderRadius: 3,
  backgroundColor: $color,
}))
