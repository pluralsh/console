import { type ComponentProps, type ReactNode } from 'react'

import styled, { useTheme } from 'styled-components'

import Chip from './Chip'
import PadlockLockedIcon from './icons/PadlockLockedIcon'
import VerifiedIcon from './icons/VerifiedIcon'
import Card, { type CardProps } from './Card'
import RocketIcon from './icons/RocketIcon'

import AppIcon from './AppIcon'
import Flex from './Flex'

type RepositoryCardProps = CardProps & {
  title?: string
  publisher?: string
  priv?: boolean
  installed?: boolean
  verified?: boolean
  trending?: boolean
  description?: string
  imageUrl?: string
  tags?: string[]
  releaseStatus?: 'ALPHA' | 'BETA' | string
  size?: 'small' | 'medium' | 'large' | string
  variant?: 'app' | 'marketing'
  featuredLabel?: ReactNode
}

const prerelease = (status?: string) => status === 'ALPHA' || status === 'BETA'

const FeaturedBorder = styled(
  ({ children, ...props }: ComponentProps<'div'>) => (
    <div {...props}>
      <div>{children}</div>
    </div>
  )
)(({ theme }) => {
  const borderThickness = 4
  const color = theme.colors['border-fill-two']

  return {
    '&, &::before': {
      overflow: 'hidden',
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: theme.borderRadiuses.large,
      display: 'flex',
      alignItems: 'start',
      justifyContent: 'start',
      pointerEvents: 'none',
    },
    '&::before': {
      content: '""',
      outline: `${borderThickness}px solid ${color}`,
      outlineOffset: -borderThickness,
    },
    '& > div': {
      ...theme.partials.text.caption,
      color: theme.colors.blue['200'],
      padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
      borderEndEndRadius: theme.borderRadiuses.large,
      pointerEvents: 'auto',
      backgroundColor: color,
      zIndex: 1,
    },
  }
})

function RepositoryCard({
  title,
  publisher,
  priv,
  installed,
  verified,
  trending,
  featuredLabel,
  description,
  imageUrl,
  tags = [],
  size = 'small',
  variant = 'app',
  releaseStatus,
  ...props
}: RepositoryCardProps) {
  const maxTags = trending ? 5 : 6
  const showRelease = prerelease(releaseStatus)
  const mainChipProps = {
    size: variant === 'marketing' ? 'small' : 'large',
    hue: 'lighter',
  } as const

  const theme = useTheme()

  return (
    <Card
      clickable
      style={{
        flexDirection: 'column',
        paddingTop: featuredLabel
          ? theme.spacing.large + theme.spacing.medium
          : theme.spacing.large,
        paddingRight: theme.spacing.large,
        paddingBottom: theme.spacing.large,
        paddingLeft: theme.spacing.large,
        width: '100%',
        position: 'relative',
      }}
      {...props}
    >
      {featuredLabel && <FeaturedBorder>{featuredLabel}</FeaturedBorder>}
      <Flex
        height="100%"
        align="flex-start"
        gap="large"
      >
        {(size === 'medium' || size === 'large') && (
          <AppIcon
            size={size === 'large' ? 'xlarge' : 'large'}
            url={imageUrl}
          />
        )}
        <Flex
          flexGrow={1}
          direction="column"
          height="100%"
        >
          <Flex align="center">
            {size === 'small' && (
              <AppIcon
                size="small"
                url={imageUrl}
              />
            )}
            <Flex
              direction="row"
              marginLeft={size === 'small' ? theme.spacing.small : 0}
              width="100%"
              align="flex-start"
              justify="space-between"
            >
              <Flex direction="column">
                <HeaderSC
                  $variant={variant}
                  $featuredLabel={!!featuredLabel}
                  $size={size}
                >
                  {title}
                  {!!verified && (
                    <VerifiedIcon
                      color="action-link-inline"
                      size={12}
                      position="relative"
                      bottom={10}
                      left={4}
                    />
                  )}
                </HeaderSC>
                <SubheaderSC
                  $variant={variant}
                  $featuredLabel={!!featuredLabel}
                  $size={size}
                >
                  {publisher}
                </SubheaderSC>
              </Flex>
              <Flex
                justifyContent="end"
                flexGrow={1}
                marginLeft={theme.spacing.medium}
                gap="small"
                alignItems="center"
              >
                {showRelease && (
                  <Chip
                    severity={releaseStatus === 'BETA' ? 'info' : 'warning'}
                    {...mainChipProps}
                  >
                    {releaseStatus}
                  </Chip>
                )}
                {!!installed && !showRelease && (
                  <Chip
                    severity="success"
                    {...mainChipProps}
                  >
                    Installed
                  </Chip>
                )}
                {!!priv && <PadlockLockedIcon paddingHorizontal={8} />}
              </Flex>
            </Flex>
          </Flex>
          {description && <DescriptionSC>{description}</DescriptionSC>}
          <div style={{ flexGrow: 1 }} />
          {(trending || tags?.length > 0) && (
            <Flex
              marginTop={theme.spacing.medium}
              gap="xsmall"
              flexWrap="wrap"
            >
              {!!trending && (
                <Chip
                  size="small"
                  hue="lighter"
                >
                  <RocketIcon color="action-link-inline" />
                  <SpanSC>Trending</SpanSC>
                </Chip>
              )}
              {tags
                ?.filter((_x, i) => i < maxTags)
                .map((tag) => (
                  <Chip
                    size="small"
                    hue="lighter"
                    key={tag}
                    _last={{ marginRight: 0 }}
                  >
                    {tag}
                  </Chip>
                ))}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

const HeaderSC = styled.h1<{
  $variant?: RepositoryCardProps['variant']
  $featuredLabel?: boolean
  $size?: RepositoryCardProps['size']
}>(({ theme, $variant, $featuredLabel, $size }) => ({
  margin: 0,
  color: theme.colors.text,
  ...($variant === 'marketing'
    ? $featuredLabel
      ? { ...theme.partials.text.title2 }
      : { ...theme.partials.text.subtitle1 }
    : $size === 'large'
    ? { ...theme.partials.text.title1 }
    : { ...theme.partials.text.title2 }),
}))

const SubheaderSC = styled.h3<{
  $variant?: RepositoryCardProps['variant']
  $featuredLabel?: boolean
  $size?: RepositoryCardProps['size']
}>(({ theme, $variant, $featuredLabel, $size }) => ({
  margin: 0,
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
  marginBottom: $size === 'large' ? theme.spacing.small : 0,
  ...($variant === 'marketing' && !$featuredLabel
    ? { ...theme.partials.text.caption }
    : {}),
}))

const SpanSC = styled.span(({ theme }) => ({
  color: theme.colors['action-link-inline'],
  marginLeft: theme.spacing.xxsmall,
}))

const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  margin: 0,
  marginTop: theme.spacing.xsmall,
  color: theme.colors['text-light'],
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}))

export default RepositoryCard
