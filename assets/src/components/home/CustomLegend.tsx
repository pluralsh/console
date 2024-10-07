import styled from 'styled-components'

export function CustomLegend({
  data,
}: {
  data: { label: string; value?: number; color: string }[]
}) {
  return (
    <LegendWrapperSC>
      {data.map((item, index) => (
        <LegendItemSC key={index}>
          <LegendSymbolSC $color={item.color} />
          <LegendTextSC>
            {`${item.value ?? ''} `}
            {item.label}
          </LegendTextSC>
        </LegendItemSC>
      ))}
    </LegendWrapperSC>
  )
}

const LegendWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing.medium,
}))
const LegendItemSC = styled.div({
  display: 'flex',
  alignItems: 'center',
})
const LegendSymbolSC = styled.div<{ $color: string }>(
  ({ $color: color, theme }) => ({
    backgroundColor: color,
    borderRadius: '50%',
    height: theme.spacing.xsmall,
    width: theme.spacing.xsmall,
  })
)
const LegendTextSC = styled.span(({ theme }) => ({
  marginLeft: theme.spacing.xsmall,
  minWidth: 'fit-content',
}))
