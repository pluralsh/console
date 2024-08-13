import { Button, Card } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

type BillingFeatureBlockBannerPropsType = {
  feature: string
  description?: string
  placeholderImageURL?: string
}

const Wrapper = styled.div<{ backgroundImage?: string }>(
  ({ theme, backgroundImage }) => ({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    alignItems: 'center',
    justifyItems: 'flex-start',
    padding: theme.spacing.large,
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: theme.colors['fill-zero'],
    zIndex: 10,

    ...(backgroundImage && {
      backgroundImage: `url(${backgroundImage})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'top center',
      backgroundSize: '100% auto',
    }),
  })
)

const Header = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  fontWeight: '600',
}))

const Description = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  marginTop: theme.spacing.medium,
}))

export default function BillingFeatureBlockBanner({
  feature,
  description,
  placeholderImageURL,
}: BillingFeatureBlockBannerPropsType) {
  const theme = useTheme()

  return (
    <Wrapper backgroundImage={placeholderImageURL}>
      <Card
        css={{ padding: theme.spacing.large }}
        fillLevel={2}
        width="100%"
      >
        <Header>Upgrade your plan to access {feature}.</Header>
        <Description>{description}</Description>
        <Button
          as="a"
          href="https://app.plural.sh/account/billing"
          target="_blank"
          rel="noopener noreferrer"
          width="max-content"
          marginTop="large"
        >
          Review plans
        </Button>
      </Card>
    </Wrapper>
  )
}
