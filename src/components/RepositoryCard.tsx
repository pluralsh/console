import { Div, type DivProps, Flex, H1, H3, P, Span } from 'honorable'
import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  forwardRef,
} from 'react'

import styled, { useTheme } from 'styled-components'

import Chip from './Chip'
import PadlockLockedIcon from './icons/PadlockLockedIcon'
import VerifiedIcon from './icons/VerifiedIcon'
import Card from './Card'
import RocketIcon from './icons/RocketIcon'

import AppIcon from './AppIcon'

type RepositoryCardProps = DivProps & {
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

function RepositoryCardRef(
  {
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
  }: RepositoryCardProps,
  ref: Ref<any>
) {
  const maxTags = trending ? 5 : 6
  const showRelease = prerelease(releaseStatus)
  const mainChipProps = {
    size: variant === 'marketing' ? 'small' : 'large',
    hue: 'lighter',
  } as const

  const theme = useTheme()

  return (
    <Card
      ref={ref}
      clickable
      flexDirection="column"
      paddingTop={
        featuredLabel ? theme.spacing.large + theme.spacing.medium : 'large'
      }
      paddingRight="large"
      paddingBottom="large"
      paddingLeft="large"
      width="100%"
      position="relative"
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
              marginLeft={size === 'small' ? 'small' : 0}
              width="100%"
              align="flex-start"
              justify="space-between"
            >
              <Flex direction="column">
                <H1
                  color="text"
                  {...(variant === 'marketing'
                    ? featuredLabel
                      ? { title2: true }
                      : { subtitle1: true }
                    : size === 'large'
                    ? { title1: true }
                    : { title2: true })}
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
                </H1>
                <H3
                  body2
                  {...(variant === 'marketing' && !featuredLabel
                    ? { caption: true }
                    : { body2: true })}
                  color="text-xlight"
                  marginBottom={size === 'large' ? 'small' : 0}
                >
                  {publisher}
                </H3>
              </Flex>
              <Flex
                justifyContent="end"
                flexGrow={1}
                marginLeft="medium"
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
          {description && (
            <P
              body2
              marginTop="xsmall"
              color="text-light"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </P>
          )}
          <Div flexGrow={1} />
          {(trending || tags?.length > 0) && (
            <Flex
              marginTop="medium"
              gap="xsmall"
              flexWrap="wrap"
            >
              {!!trending && (
                <Chip
                  size="small"
                  hue="lighter"
                >
                  <RocketIcon color="action-link-inline" />
                  <Span
                    color="action-link-inline"
                    marginLeft="xxsmall"
                  >
                    Trending
                  </Span>
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

const RepositoryCard = forwardRef(RepositoryCardRef)

export default RepositoryCard
