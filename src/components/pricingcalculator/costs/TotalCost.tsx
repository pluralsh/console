import styled from 'styled-components'

type TotalCostWrapProps = {
  marginTop?: number
}

const TotalCostWrap = styled.div<TotalCostWrapProps>(
  ({ theme, marginTop }) => ({
    display: 'flex',
    gap: theme.spacing.xxlarge,
    marginTop: marginTop || theme.spacing.xxlarge,

    '.value': {
      ...theme.partials.text.title1,
      color: theme.colors['text-warning-light'],
      marginRight: theme.spacing.xxsmall,

      '&.primary': {
        color: theme.colors.purple[200],
      },
    },

    '.provider': {
      ...theme.partials.text.body2Bold,
      color: theme.colors.text,
    },
  })
)

export type TotalCostProps = {
  providerCost: number
  provider: string
  pluralCost?: number
  proPlan?: boolean
  marginTop?: number
}

export default function TotalCost({
  providerCost,
  provider,
  pluralCost,
  proPlan,
  marginTop,
}: TotalCostProps) {
  return (
    <TotalCostWrap marginTop={marginTop}>
      <div>
        <div className="value">~${providerCost}</div>
        <div>
          per month to <span className="provider">{provider}</span>
        </div>
      </div>
      {!!pluralCost && proPlan && (
        <div>
          <div className="value primary">${pluralCost}</div>
          <div>
            (Professional) <span className="provider">Plural</span>
          </div>
        </div>
      )}
    </TotalCostWrap>
  )
}
